import { REPORT_STATUS_LABELS, type ReportStatus } from '@edtc/shared'
import { Badge, type BadgeTone } from '~/components/ui/Badge'

const TONES: Record<ReportStatus, BadgeTone> = { draft: 'neutral', submitted: 'warning', approved: 'success', rejected: 'danger' }

/** status が null なら未作成 */
export function ReportStatusBadge({ status }: { status: ReportStatus | null }) {
  if (!status) return <Badge>未作成</Badge>
  return <Badge tone={TONES[status]}>{REPORT_STATUS_LABELS[status]}</Badge>
}
