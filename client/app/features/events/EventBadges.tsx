import { EVENT_CATEGORY_LABELS, RSVP_STATUS_LABELS, type Division, type EventCategory, type RsvpStatus } from '@edtc/shared'
import { Badge, type BadgeTone } from '~/components/ui/Badge'

const CATEGORY_TONES: Record<EventCategory, BadgeTone> = {
  activity: 'accent',
  outreach: 'success',
  meeting: 'neutral',
  social: 'warning',
  other: 'neutral',
}

export function CategoryBadge({ category }: { category: EventCategory }) {
  return <Badge tone={CATEGORY_TONES[category]}>{EVENT_CATEGORY_LABELS[category]}</Badge>
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
