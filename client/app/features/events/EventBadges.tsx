import { RSVP_STATUS_LABELS, type CategoryTone, type Division, type RsvpStatus } from '@edtc/shared'
import { Badge, type BadgeTone } from '~/components/ui/Badge'

/** イベントの種類。表示名と色はAPIが返す（管理者が「種類・種別の管理」で決める） */
export function CategoryBadge({ label, tone }: { label: string; tone: CategoryTone }) {
  return <Badge tone={tone satisfies BadgeTone}>{label}</Badge>
}

const RSVP_TONES: Record<RsvpStatus, BadgeTone> = { going: 'success', maybe: 'warning', declined: 'neutral' }

/** 対象外のイベントは、回答していなくても「未回答」を出さない */
export function RsvpBadge({ status, isTarget = true }: { status: RsvpStatus | null; isTarget?: boolean }) {
  if (status) return <Badge tone={RSVP_TONES[status]}>{RSVP_STATUS_LABELS[status]}</Badge>
  return isTarget ? <Badge tone="danger">未回答</Badge> : null
}

/** 対象を指定したイベントの印（全員向けなら何も出さない） */
export function TargetBadge({ divisions, userCount }: { divisions: Division[]; userCount: number }) {
  if (divisions.length > 0) return <Badge>{divisions.join('・')}{userCount > 0 && ' ほか'}向け</Badge>
  return userCount > 0 ? <Badge>対象者限定</Badge> : null
}
