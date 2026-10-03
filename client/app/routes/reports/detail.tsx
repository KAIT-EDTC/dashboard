import { isLeader, reportDraftSchema, reportReviewSchema, reportSubmitSchema } from '@edtc/shared'
import { useMemo } from 'react'
import { redirect } from 'react-router'
import { css } from 'styled-system/css'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { saveDraft } from '~/features/reports/autosave'
import { contentOf, contextOf, latestRejection } from '~/features/reports/content'
import { ReportForm, type ReportActionData, type ReportIntent } from '~/features/reports/ReportForm'
import { ReportStatusBadge } from '~/features/reports/ReportStatusBadge'
import { ReportView } from '~/features/reports/ReportView'
import { ReviewProgress } from '~/features/reports/ReviewHistory'
import { ReviewStatus, ReviewWorkspace } from '~/features/reports/ReviewPanel'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { Route } from './+types/detail'

export const meta: Route.MetaFunction = ({ data }) => [{ title: `活動報告書: ${data?.report.event.title ?? ''} | EDTC ダッシュボード` }]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [detail, { approvers }] = await Promise.all([
    unwrap(api.reports[':id'].$get({ param: { id: params.reportId } })),
    unwrap(api.reports.approvers.$get()),
  ])
  return { ...detail, approvers }
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
      return 'ok' in result ? redirect('/reports') : result
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
    case 'withdraw':
      return run(() => unwrap(api.reports[':id'].withdraw.$post({ param })))
    case 'review': {
      const parsed = reportReviewSchema.safeParse(review)
      if (!parsed.success) return { ...zodErrors(parsed.error), intent }
      return run(() => unwrap(api.reports[':id'].review.$post({ param, json: parsed.data })))
    }
  }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function ReportPage({ loaderData }: Route.ComponentProps) {
  const { report, authorRole, canEdit, canDelete, canReview, canWithdraw, approvers } = loaderData
  const me = useCurrentUser()
  const isAuthor = report.authorId === me.id
  const autosave = useMemo(() => saveDraft(report.id), [report.id])

  return (
    <>
      <PageHeader
        title={report.event.title}
        description={
          <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
            <ReportStatusBadge status={report.status} step={report.approvalSteps[report.currentStep]} />
            活動報告書 · {fullName(report.author)}
          </span>
        }
        back={
          isAuthor
            ? { to: '/reports?tab=mine', label: '自分の報告書' }
            : canReview
              ? { to: '/reports?tab=review', label: '承認待ち' }
              : { to: `/events/${report.event.id}`, label: 'イベント' }
        }
      />
      {canEdit ? (
        <ReportForm
          key={report.updatedAt}
          context={contextOf(report, authorRole)}
          initial={contentOf(report)}
          status={report.status}
          divisions={me.divisions}
          canDelete={canDelete}
          rejection={latestRejection(report.reviews)}
          isLeader={isLeader(me)}
          approvers={approvers}
          autosave={autosave}
          aside={<ReviewProgress report={report} />}
        />
      ) : canReview ? (
        <ReviewWorkspace key={`${report.id}-${report.currentStep}`} report={report} authorRole={authorRole} />
      ) : (
        <ReportView report={report} authorRole={authorRole} aside={<ReviewStatus report={report} canWithdraw={canWithdraw} />} />
      )}
    </>
  )
}
