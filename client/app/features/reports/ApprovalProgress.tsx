import { APPROVAL_STEP_LABELS } from '@edtc/shared'
import { css, cva } from 'styled-system/css'
import { Card } from '~/components/ui/Card'
import { CheckIcon, ClockIcon, XIcon } from '~/components/ui/Icons'
import { formatTimestamp, fullName } from '~/lib/format'
import type { ReportDetail } from './types'

const markStyle = cva({
  base: { w: '24px', h: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'full', fontSize: 'xs', fontWeight: '700' },
  variants: {
    state: {
      done: { bg: 'success.subtle', color: 'success.fg' },
      current: { bg: 'warning.subtle', color: 'warning.fg' },
      rejected: { bg: 'danger.subtle', color: 'danger.fg' },
      waiting: { bg: 'surface.muted', color: 'fg.subtle' },
    },
  },
})

/** 承認の流れ（部署長 → 本部長 など）と、それぞれの段階の状況 */
export function ApprovalProgress({ report }: { report: Pick<ReportDetail, 'status' | 'approvalSteps' | 'currentStep' | 'reviews' | 'approver' | 'division'> }) {
  if (report.approvalSteps.length === 0) return null
  return (
    <Card title="承認の流れ">
      <ol className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', fontSize: 'sm' })}>
        {report.approvalSteps.map((step, index) => {
          const done = report.status === 'approved' || index < report.currentStep
          const isCurrent = !done && index === report.currentStep
          const state = done ? 'done' : isCurrent ? (report.status === 'rejected' ? 'rejected' : report.status === 'submitted' ? 'current' : 'waiting') : 'waiting'
          const withdrawn = isCurrent && report.status === 'draft'
          // その段階の最後の承認
          const approval = done ? [...report.reviews].reverse().find((r) => r.step === step && r.decision === 'approve') : undefined
          return (
            <li key={step} className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
              <span className={markStyle({ state })}>
                {state === 'done' ? <CheckIcon size={14} /> : state === 'rejected' ? <XIcon size={14} /> : state === 'current' ? <ClockIcon size={14} /> : index + 1}
              </span>
              <span className={css({ fontWeight: '600' })}>
                {step === 'designated' && report.approver ? `${fullName(report.approver)}（承認者）` : step === 'division_head' && report.division ? `${report.division}長` : APPROVAL_STEP_LABELS[step]}
              </span>
              <span className={css({ flex: 1, fontSize: 'xs', color: 'fg.muted' })}>
                {approval
                  ? `${approval.reviewer ? fullName(approval.reviewer) : '退会したメンバー'} が承認 · ${formatTimestamp(approval.createdAt)}`
                  : state === 'current'
                    ? '確認中'
                    : state === 'rejected'
                      ? '修正依頼'
                      : withdrawn
                        ? '取り消し中'
                        : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
