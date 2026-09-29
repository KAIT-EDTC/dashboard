/**
 * 日時は「日本時間の壁時計時刻」を `YYYY-MM-DDTHH:mm` 形式の文字列で扱う。
 * <input type="datetime-local"> の値をそのまま保存でき、文字列比較で並べ替えられる。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 現在の日本時間 (`YYYY-MM-DDTHH:mm`) */
export function nowInJst(now: Date = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 16)
}

/** 今日の日付 (`YYYY-MM-DD`, 日本時間) */
export function todayInJst(now: Date = new Date()): string {
  return nowInJst(now).slice(0, 10)
}

/** 年度（4月始まり） */
export function fiscalYearOf(date: string | Date = new Date()): number {
  const ymd = typeof date === 'string' ? date : todayInJst(date)
  const [year, month] = ymd.split('-').map(Number)
  return month >= 4 ? year : year - 1
}
