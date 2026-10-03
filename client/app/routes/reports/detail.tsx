import { reportDraftSchema, reportReviewSchema, reportSubmitSchema } from '@edtc/shared'
import { redirect } from 'react-router'
import { css } from 'styled-system/css'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { ReportForm, type ReportActionData, type ReportIntent } from '~/features/reports/ReportForm'
import { ReportStatusBadge } from '~/features/reports/ReportStatusBadge'
import { ReportView } from '~/features/reports/ReportView'
import { ReviewPanel, ReviewStatus } from '~/features/reports/ReviewPanel'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { Route } from './+types/detail'

export const meta: Route.MetaFunction = ({ data }) => [{ title: `活動報告書: ${data?.report.event.title ?? ''} | EDTC ダッシュボード` }]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return unwrap(api.reports[':id'].$get({ param: { id: params.reportId } }))
}

/** フォームから JSON で { intent, content } か { intent: 'review', review } が送られてくる */
export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<ReportActionData | Response> {
  const { intent, content, review } = (await request.json()) as { intent: ReportIntent; content?: unknown; review?: unknown }
  const param = { id: params.reportId }

  const run = async (fn: () => Promise<unknown>): Promise<ReportActionData> => {
    const result = await catchApiError(fn)
    return result.errors ? { ...result.errors, intent } : { ok: true, intent }
  }

  switch (intent) {
    case 'delete': {
      const result = await run(() => unwrap(api.reports[':id'].$delete({ param })))
      return 'ok' in result ? redirect('/reports?tab=mine') : result
    }
    case 'save': {
      const parsed = reportDraftSchema.safeParse(content)
      if (!parsed.success) return { ...zodErrors(parsed.error), intent }
      return run(() => unwrap(api.reports[':id'].$put({ param, json: parsed.data })))
    }
    case 'submit': {
      const parsed = reportSubmitSchema.safeParse(content)
      if (!parsed.success) return { ...zodErrors(parsed.error), intent }
      return run(() => unwrap(api.reports[':id'].submit.$post({ param, json: parsed.data })))
    }
    case 'review': {
      const parsed = reportReviewSchema.safeParse(review)
      if (!parsed.success) return { ...zodErrors(parsed.error), intent }
      return run(() => unwrap(api.reports[':id'].review.$post({ param, json: parsed.data })))
    }
  }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function ReportPage({ loaderData }: Route.ComponentProps) {
  const { report, authorRole, canEdit, canReview } = loaderData
  const me = useCurrentUser()
  const isAuthor = report.authorId === me.id

  return (
    <>
      <PageHeader
        title={report.event.title}
        description={
          <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
            <ReportStatusBadge status={report.status} />
            活動報告書 · {fullName(report.author)}
          </span>
        }
        back={isAuthor ? { to: '/reports?tab=mine', label: '自分の報告書' } : canReview ? { to: '/reports?tab=review', label: '承認待ち' } : { to: `/events/${report.event.id}`, label: 'イベント' }}
      />
      {canEdit ? (
        <ReportForm key={report.id} {...loaderData} divisions={me.divisions} />
      ) : (
        <ReportView
          report={report}
          authorRole={authorRole}
          aside={canReview ? <ReviewPanel key={report.updatedAt} report={report} /> : <ReviewStatus report={report} isAuthor={isAuthor} />}
        />
      )}
    </>
  )
}
