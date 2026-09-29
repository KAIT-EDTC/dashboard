export const EVENT_CATEGORIES = ['activity', 'outreach', 'meeting', 'social', 'other'] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  activity: '活動',
  outreach: '対外活動',
  meeting: 'ミーティング',
  social: '親睦',
  other: 'その他',
}

export const RSVP_STATUSES = ['going', 'maybe', 'declined'] as const
export type RsvpStatus = (typeof RSVP_STATUSES)[number]
export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  going: '参加',
  maybe: '未定',
  declined: '不参加',
}

/** personal: 各自が持参するもの / shared: 誰か1人が用意すればよいもの（担当者を決める） */
export const ITEM_KINDS = ['personal', 'shared'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]
export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  personal: '各自持参',
  shared: '共有（担当者が用意）',
}

/** 活動での役割。講師は1イベントにつき1人まで（主催者が選ぶ）、それ以外の参加者は講師補助 */
export const PARTICIPANT_ROLES = ['lecturer', 'assistant'] as const
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number]
export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  lecturer: '講師',
  assistant: '講師補助',
}
