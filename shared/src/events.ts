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

/** personal: 参加者全員がそれぞれ持ってくるもの / shared: 誰か1人が持ってくるもの（担当者を決める。未定なら募集） */
export const ITEM_KINDS = ['personal', 'shared'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

/** 活動での役割。講師は1イベントにつき1人まで（主催者が選ぶ）、それ以外の参加者は講師補助 */
export const PARTICIPANT_ROLES = ['lecturer', 'assistant'] as const
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number]
export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  lecturer: '講師',
  assistant: '講師補助',
}
