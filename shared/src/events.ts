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

/** シフト1枠に入れる人の上限 */
export const SHIFT_MEMBERS_MAX = 50

/** 2つの時間帯が重なるか（`YYYY-MM-DDTHH:mm` の文字列比較。終わりと始まりが同じ時刻なら重ならない） */
export const timesOverlap = (a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }) =>
  a.startsAt < b.endsAt && b.startsAt < a.endsAt

/** シフトの時間帯で選べる時刻（時）。終了は 24 まで */
export const SHIFT_HOUR_MIN = 0
export const SHIFT_HOUR_MAX = 24
/** シフトを組める日数の上限（イベントの開始日から終了日まで） */
export const SHIFT_DAYS_MAX = 7

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 時（9）→ 09:00。24 は 24:00 と書く */
export const hourLabel = (hour: number) => `${pad2(hour)}:00`

/** 1時間の枠の開始（`YYYY-MM-DDTHH:00`）。出れない時間はこの形で保存する */
export const hourSlot = (day: string, hour: number) => `${day}T${pad2(hour)}:00`

/** 枠の終わりの日時。24時は翌日の0時にする（文字列比較で前後が分かるように） */
export function dayTime(day: string, hour: number): string {
  if (hour < 24) return hourSlot(day, hour)
  const next = new Date(`${day}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return `${next.toISOString().slice(0, 10)}T00:00`
}

/** シフトを組む日（イベントの開始日〜終了日。終了日が無ければ開始日だけ）。多すぎる分は切る */
export function shiftDays(event: { startsAt: string; endsAt: string | null }): string[] {
  const first = event.startsAt.slice(0, 10)
  const last = (event.endsAt ?? event.startsAt).slice(0, 10)
  const days: string[] = []
  for (const d = new Date(`${first}T00:00:00Z`); days.length < SHIFT_DAYS_MAX; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10)
    if (day > last) break
    days.push(day)
  }
  return days
}

/** シフトの時間帯にかかる1時間ごとの枠（`YYYY-MM-DDTHH:00`）。出れない時間はこの中から選ぶ */
export function shiftHours(range: { startsAt: string; endsAt: string }): string[] {
  const slots: string[] = []
  for (const d = new Date(`${range.startsAt.slice(0, 13)}:00:00Z`); slots.length < SHIFT_DAYS_MAX * 24; d.setUTCHours(d.getUTCHours() + 1)) {
    const slot = d.toISOString().slice(0, 16)
    if (slot >= range.endsAt) break
    slots.push(slot)
  }
  return slots
}
