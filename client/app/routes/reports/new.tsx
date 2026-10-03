import { isLeader, reportDraftSchema, reportSubmitSchema } from '@edtc/shared'
import { useMemo } from 'react'
import { redirect } from 'react-router'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { createDraft } from '~/features/reports/autosave'
import { ReportForm, type ReportActionData, type ReportIntent } from '~/features/reports/ReportForm'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import type { Route } from './+types/new'

export const meta: Route.MetaFunction = ({ data }) => [{ title: `活動報告書を書く: ${data?.event.title ?? ''} | EDTC ダッシュボード` }]

/** /reports/new?eventId=… 。すでに書いていればその報告書へ */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const eventId = new URL(request.url).searchParams.get('eventId')
  if (!eventId) throw redirect('/reports')
  const [{ existingId, draft }, { approvers }] = await Promise.all([
    unwrap(api.reports.new.$get({ query: { eventId } })),
    unwrap(api.reports.approvers.$get()),
  ])
  if (existingId || !draft) throw redirect(`/reports/${existingId}`)
  return { eventId, ...draft, approvers }
}

/** 初めて保存・提出したときに報告書を作り、その報告書のページへ移る */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<ReportActionData | Response> {
  const { intent, content } = (await request.json()) as { intent: ReportIntent; content?: unknown }
  const eventId = new URL(request.url).searchParams.get('eventId') ?? ''

  const schema = intent === 'submit' ? reportSubmitSchema : reportDraftSchema
  const parsed = schema.safeParse(content)
  if (!parsed.success) return { ...zodErrors(parsed.error), intent }

  const created = await catchApiError(() => unwrap(api.reports.$post({ json: { ...parsed.data, eventId } })))
  if (created.errors) return { ...created.errors, intent }
  const param = { id: created.data.id }
  if (intent === 'submit') {
    // 提出に失敗しても下書きは残っているので、報告書のページでやり直せる
    await catchApiError(() => unwrap(api.reports[':id'].submit.$post({ param, json: reportSubmitSchema.parse(parsed.data) })))
  }
  return redirect(`/reports/${param.id}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function NewReportPage({ loaderData }: Route.ComponentProps) {
  const { eventId, event, author, authorRole, division, approvers } = loaderData
  const me = useCurrentUser()
  const autosave = useMemo(() => createDraft(eventId), [eventId])
  return (
    <>
      <PageHeader title={event.title} description="活動報告書を書く" back={{ to: '/reports', label: '活動報告書' }} />
      <ReportForm
        context={{ event, author, authorRole, submittedAt: null }}
        initial={{ division, content: '', reflection: '', rating: null, notes: '', approverId: null }}
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
