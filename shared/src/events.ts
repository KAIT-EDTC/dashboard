/** イベントの種類のID。管理者が「種類・種別の管理」で増減するので、固定の一覧は持たない */
export type EventCategory = string

/** 種類の色（バッジ・カレンダーで使う）。Badge の tone と同じ名前 */
export const CATEGORY_TONES = ['accent', 'success', 'warning', 'danger', 'neutral'] as const
export type CategoryTone = (typeof CATEGORY_TONES)[number]
export const CATEGORY_TONE_LABELS: Record<CategoryTone, string> = {
  accent: '青',
  success: '緑',
  warning: '黄',
  danger: '赤',
  neutral: '灰',
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
