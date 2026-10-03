import {
  isLeader,
  REPORT_KIND_LABELS,
  reportDraftSchema,
  reportReviewSchema,
  reportSubmitSchema,
  summaryDraftSchema,
  summarySubmitSchema,
} from '@edtc/shared'
import { useMemo } from 'react'
import { redirect } from 'react-router'
import { css } from 'styled-system/css'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { ApprovalProgress } from '~/features/reports/ApprovalProgress'
import { ExportButton } from '~/features/reports/ExportButton'
import { saveDraft, saveSummaryDraft } from '~/features/reports/autosave'
import { contentOf, summaryContentOf } from '~/features/reports/content'
import { ReportForm, type ReportActionData, type ReportIntent } from '~/features/reports/ReportForm'
import { ReportStatusBadge } from '~/features/reports/ReportStatusBadge'
import { ReportView } from '~/features/reports/ReportView'
import { ReviewHistory } from '~/features/reports/ReviewHistory'
import { ReviewStatus, ReviewWorkspace } from '~/features/reports/ReviewPanel'
import { SummaryForm } from '~/features/reports/SummaryForm'
import { SummaryView } from '~/features/reports/SummaryView'
import { latestRejection } from '~/features/reports/types'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { Route } from './+types/detail'

export const meta: Route.MetaFunction = ({ data }) => [
  { title: `${REPORT_KIND_LABELS[data?.report.kind ?? 'activity']}: ${data?.report.event.title ?? ''} | EDTC ダッシュボード` },
]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [detail, { approvers }] = await Promise.all([
    unwrap(api.reports[':id'].$get({ param: { id: params.reportId } })),
    unwrap(api.reports.approvers.$get()),
  ])
  return { ...detail, approvers }
}

/** フォームから JSON で { intent, kind, content } か { intent: 'review', review } が送られてくる */
export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<ReportActionData | Response> {
  const { intent, kind, content, review } = (await request.json()) as { intent: ReportIntent; kind?: 'summary'; content?: unknown; review?: unknown }
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
      if (kind === 'summary') {
        const parsed = summaryDraftSchema.safeParse(content)
        if (!parsed.success) return { ...zodErrors(parsed.error), intent }
        return run(() => unwrap(api.reports.summaries[':id'].$put({ param, json: parsed.data })))
      }
      const parsed = reportDraftSchema.safeParse(content)
      if (!parsed.success) return { ...zodErrors(parsed.error), intent }
      return run(() => unwrap(api.reports[':id'].$put({ param, json: parsed.data })))
    }
    case 'submit': {
      if (kind === 'summary') {
        const parsed = summarySubmitSchema.safeParse(content)
        if (!parsed.success) return { ...zodErrors(parsed.error), intent }
        return run(() => unwrap(api.reports.summaries[':id'].submit.$post({ param, json: parsed.data })))
      }
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
  const { report, authorRole, members, canEdit, canDelete, canReview, canWithdraw, approvers } = loaderData
  const me = useCurrentUser()
  const isAuthor = report.authorId === me.id
  const isSummary = report.kind === 'summary'
  const autosave = useMemo(() => saveDraft(report.id), [report.id])
  const autosaveSummary = useMemo(() => saveSummaryDraft(report.id), [report.id])
  const formProps = {
    status: report.status,
    divisions: me.divisions,
    canDelete,
    rejection: latestRejection(report.reviews),
    isLeader: isLeader(me),
    approvers,
    aside: (
      <>
        <ApprovalProgress report={report} />
        <ReviewHistory reviews={report.reviews} />
      </>
    ),
  }
  const context = { event: report.event, author: report.author, authorRole, submittedAt: report.submittedAt }

  return (
    <>
      <PageHeader
        title={report.event.title}
        description={
          <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
            <ReportStatusBadge status={report.status} step={report.approvalSteps[report.currentStep]} />
            {REPORT_KIND_LABELS[report.kind]} · {fullName(report.author)}
          </span>
        }
        actions={report.status === 'approved' && <ExportButton reportId={report.id} />}
        back={
          isAuthor
            ? { to: '/reports?tab=mine', label: '自分の報告書' }
            : canReview
              ? { to: '/reports?tab=review', label: '承認待ち' }
              : { to: `/events/${report.event.id}`, label: 'イベント' }
        }
      />
      {canEdit ? (
        isSummary ? (
          <SummaryForm
            key={report.updatedAt}
            context={{ ...context, kind: 'summary' }}
            initial={summaryContentOf(report)}
            members={members}
            autosave={autosaveSummary}
            {...formProps}
          />
        ) : (
          <ReportForm key={report.updatedAt} context={context} initial={contentOf(report)} autosave={autosave} {...formProps} />
        )
      ) : canReview ? (
        <ReviewWorkspace key={`${report.id}-${report.currentStep}`} report={report} authorRole={authorRole} members={members} />
      ) : isSummary ? (
        <SummaryView report={report} members={members} aside={<ReviewStatus report={report} canWithdraw={canWithdraw} />} />
      ) : (
        <ReportView report={report} authorRole={authorRole} aside={<ReviewStatus report={report} canWithdraw={canWithdraw} />} />
      )}
    </>
  )
}
