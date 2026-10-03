import { canApproveStep, type ApprovalStep, type Division, type ReportStatus } from '@edtc/shared'
import type { Session } from '../../env'

type ReviewTarget = {
  authorId: string
  status: ReportStatus
  division: Division | null
  approverId: string | null
  approvalSteps: ApprovalStep[]
  currentStep: number
}

/** 活動報告書のその段階を承認・修正依頼できるか（自分の報告書は除く。管理者は関わらない） */
function canReviewStep(session: Session, report: ReviewTarget, step: ApprovalStep | undefined): boolean {
  if (!step || report.authorId === session.userId) return false
  return canApproveStep({ ...session, id: session.userId }, step, report)
}

/** 承認待ちで、いまの段階を自分が担当している */
export function canReviewNow(session: Session, report: ReviewTarget): boolean {
  return report.status === 'submitted' && canReviewStep(session, report, report.approvalSteps[report.currentStep])
}

/** 承認の流れのどこかを担当している（提出後の報告書を見られる） */
export function isApprover(session: Session, report: ReviewTarget): boolean {
  return report.approvalSteps.some((step) => canReviewStep(session, report, step))
}

/** 承認済みはメンバー全員、それ以外は本人と承認の流れにいる人（部署長・本部長・代表）だけが見られる */
export function canView(session: Session, report: ReviewTarget): boolean {
  if (report.status === 'approved' || report.authorId === session.userId) return true
  return report.status !== 'draft' && isApprover(session, report)
}
