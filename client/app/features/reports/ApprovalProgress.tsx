import { APPROVAL_STEP_LABELS, divisionHeadLabel, type ApprovalStep } from '@edtc/shared'
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

type Progress = Pick<ReportDetail, 'status' | 'approvalSteps' | 'currentStep' | 'reviews' | 'approver' | 'division'>
type StepState = 'done' | 'current' | 'rejected' | 'waiting'

/** その段階の状態と、横に出す説明 */
function stepState(report: Progress, index: number): { state: StepState; note: string } {
  if (report.status === 'approved' || index < report.currentStep) {
    // その段階の最後の承認
    const step = report.approvalSteps[index]
    const approval = [...report.reviews].reverse().find((r) => r.step === step && r.decision === 'approve')
    const note = approval ? `${approval.reviewer ? fullName(approval.reviewer) : '退会したメンバー'} が承認 · ${formatTimestamp(approval.createdAt)}` : ''
    return { state: 'done', note }
  }
  if (index !== report.currentStep) return { state: 'waiting', note: '' }
  if (report.status === 'submitted') return { state: 'current', note: '確認中' }
  if (report.status === 'rejected') return { state: 'rejected', note: '修正依頼' }
  return { state: 'waiting', note: '取り消し中' }
}

function stepLabel(report: Progress, step: ApprovalStep): string {
  if (step === 'designated' && report.approver) return `${fullName(report.approver)}（承認者）`
  if (step === 'division_head' && report.division) return divisionHeadLabel(report.division)
  return APPROVAL_STEP_LABELS[step]
}

/** 承認の流れ（部署長 → 本部長 など）と、それぞれの段階の状況 */
export function ApprovalProgress({ report }: { report: Progress }) {
  if (report.approvalSteps.length === 0) return null
  return (
    <Card title="承認の流れ">
      <ol className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', fontSize: 'sm' })}>
        {report.approvalSteps.map((step, index) => {
          const { state, note } = stepState(report, index)
          return (
            <li key={step} className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
              <span className={markStyle({ state })}>
                {state === 'done' ? <CheckIcon size={14} /> : state === 'rejected' ? <XIcon size={14} /> : state === 'current' ? <ClockIcon size={14} /> : index + 1}
              </span>
              <span className={css({ fontWeight: '600' })}>{stepLabel(report, step)}</span>
              <span className={css({ flex: 1, fontSize: 'xs', color: 'fg.muted' })}>{note}</span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
