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

/** イベントに添付できるファイルの上限（1ファイルあたりのバイト数と、1イベントあたりの個数） */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_COUNT = 10
// R2の無料枠(10GB)を超えないよう、添付の合計がこれを超えたらアップロードを止める
export const ATTACHMENT_TOTAL_MAX_BYTES = 8 * 1024 * 1024 * 1024
