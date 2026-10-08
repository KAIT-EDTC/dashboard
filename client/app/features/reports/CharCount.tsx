import { countChars } from '@edtc/shared'
import { cva } from 'styled-system/css'

const countStyle = cva({
  base: { display: 'block', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  variants: {
    state: {
      ok: { color: 'fg.subtle' },
      short: { color: 'warning.fg' },
      over: { color: 'danger.fg', fontWeight: '600' },
    },
  },
})

/** 入力欄の下に出す文字数。上限を超えたら赤、最低文字数に届かなければ黄色 */
export function CharCount({ value, min, max }: { value: string; min?: number; max: number }) {
  const count = countChars(value)
  const state = count > max ? 'over' : min !== undefined && count < min ? 'short' : 'ok'
  return (
    <span className={countStyle({ state })}>
      {count} / {max}字{min !== undefined && `（${min}字以上）`}
    </span>
  )
}
