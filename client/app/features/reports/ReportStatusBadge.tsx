import { APPROVAL_STEP_LABELS, REPORT_STATUS_LABELS, type ApprovalStep, type ReportStatus } from '@edtc/shared'
import { Badge, type BadgeTone } from '~/components/ui/Badge'

const TONES: Record<ReportStatus, BadgeTone> = { draft: 'neutral', submitted: 'warning', approved: 'success', rejected: 'danger' }

/** status が null なら未作成（emptyLabel で変えられる）。承認待ちなら、いまの段階（部署長の確認待ち など）を出す */
export function ReportStatusBadge({ status, step, emptyLabel = '未作成' }: { status: ReportStatus | null; step?: ApprovalStep; emptyLabel?: string }) {
  if (!status) return <Badge>{emptyLabel}</Badge>
  const label = status === 'submitted' && step ? `${APPROVAL_STEP_LABELS[step]}の確認待ち` : REPORT_STATUS_LABELS[status]
  return <Badge tone={TONES[status]}>{label}</Badge>
}
