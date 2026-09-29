import {
  EVENT_CATEGORY_LABELS,
  PARTICIPANT_ROLE_LABELS,
  RSVP_STATUS_LABELS,
  type EventCategory,
  type ParticipantRole,
  type RsvpStatus,
} from '@edtc/shared'
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

export function RsvpBadge({ status }: { status: RsvpStatus | null }) {
  return status ? <Badge tone={RSVP_TONES[status]}>{RSVP_STATUS_LABELS[status]}</Badge> : <Badge tone="danger">未回答</Badge>
}

export function RoleBadge({ role }: { role: ParticipantRole }) {
  return <Badge tone={role === 'lecturer' ? 'accent' : 'neutral'}>{PARTICIPANT_ROLE_LABELS[role]}</Badge>
}
