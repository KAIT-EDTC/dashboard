const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function parts(value: string) {
  const [date, time] = value.split('T')
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d, time, weekday: WEEKDAYS[new Date(y, m - 1, d).getDay()] }
}

/** 2026-10-10 → 10/10(土)。今年でなければ年も付ける */
export function formatDate(value: string, { withYear }: { withYear?: boolean } = {}): string {
  const { y, m, d, weekday } = parts(value)
  const showYear = withYear ?? y !== new Date().getFullYear()
  return `${showYear ? `${y}/` : ''}${m}/${d}(${weekday})`
}

/** 2026-10-10T13:00 → 10/10(土) 13:00 */
export function formatDateTime(value: string, options?: { withYear?: boolean }): string {
  const { time } = parts(value)
  return time ? `${formatDate(value, options)} ${time}` : formatDate(value, options)
}

/** 開始〜終了。同じ日なら終了は時刻だけ */
export function formatRange(startsAt: string, endsAt: string | null): string {
  if (!endsAt) return formatDateTime(startsAt)
  const sameDay = startsAt.slice(0, 10) === endsAt.slice(0, 10)
  return `${formatDateTime(startsAt)} 〜 ${sameDay ? endsAt.slice(11) : formatDateTime(endsAt)}`
}

/** ISO8601 (UTC) → 2026/10/10 13:00（ローカル時刻） */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })
}

/** バイト数 → 1.2 MB のような表記 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const formatYen = (value: number) => `${value.toLocaleString('ja-JP')}円`

type NamedMember = { lastName: string; firstName: string; nickname?: string }

export const fullName = (m: NamedMember) => `${m.lastName} ${m.firstName}`

/** 呼び名があれば「山田 太郎（たろう）」 */
export const displayName = (m: NamedMember) => (m.nickname ? `${fullName(m)}（${m.nickname}）` : fullName(m))
