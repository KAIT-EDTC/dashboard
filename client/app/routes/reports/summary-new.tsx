import { isLeader, summaryDraftSchema, summarySubmitSchema } from '@edtc/shared'
import { useMemo } from 'react'
import { redirect } from 'react-router'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { createSummaryDraft } from '~/features/reports/autosave'
import type { ReportActionData, ReportIntent } from '~/features/reports/ReportForm'
import { SummaryForm } from '~/features/reports/SummaryForm'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import type { Route } from './+types/summary-new'

export const meta: Route.MetaFunction = ({ data }) => [{ title: `まとめ報告書を書く: ${data?.event.title ?? ''} | EDTC ダッシュボード` }]

/** /reports/summaries/new?eventId=… 。すでにあればそのまとめ報告書へ */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const eventId = new URL(request.url).searchParams.get('eventId')
  if (!eventId) throw redirect('/reports')
  const [{ existingId, draft }, { approvers }] = await Promise.all([
    unwrap(api.reports.summaries.new.$get({ query: { eventId } })),
    unwrap(api.reports.approvers.$get()),
  ])
  if (existingId || !draft) throw redirect(`/reports/${existingId}`)
  return { eventId, ...draft, approvers }
}

/** 初めて保存・提出したときに作り、そのページへ移る */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<ReportActionData | Response> {
  const { intent, content } = (await request.json()) as { intent: ReportIntent; content?: unknown }
  const eventId = new URL(request.url).searchParams.get('eventId') ?? ''

  const schema = intent === 'submit' ? summarySubmitSchema : summaryDraftSchema
  const parsed = schema.safeParse(content)
  if (!parsed.success) return { ...zodErrors(parsed.error), intent }

  const created = await catchApiError(() => unwrap(api.reports.summaries.$post({ json: { ...parsed.data, eventId } })))
  if (created.errors) return { ...created.errors, intent }
  const param = { id: created.data.id }
  if (intent === 'submit') {
    // 提出に失敗しても下書きは残っているので、まとめ報告書のページでやり直せる
    await catchApiError(() => unwrap(api.reports.summaries[':id'].submit.$post({ param, json: summarySubmitSchema.parse(parsed.data) })))
  }
  return redirect(`/reports/${param.id}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function NewSummaryPage({ loaderData }: Route.ComponentProps) {
  const { eventId, event, author, division, members, analyses, approvers } = loaderData
  const me = useCurrentUser()
  const autosave = useMemo(() => createSummaryDraft(eventId), [eventId])
  return (
    <>
      <PageHeader title={event.title} description="まとめ報告書を書く" back={{ to: `/events/${eventId}`, label: 'イベント' }} />
      <SummaryForm
        context={{ event, author, authorRole: null, submittedAt: null, kind: 'summary' }}
        initial={{ division, content: '', hosting: null, analyses, overview: '', impressions: '', rating: null, notes: '', approverId: null }}
        members={members}
        status="draft"
        divisions={me.divisions}
        canDelete={false}
        autosave={autosave}
        isLeader={isLeader(me)}
        approvers={approvers}
      />
    </>
  )
}
