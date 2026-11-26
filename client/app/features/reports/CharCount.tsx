import { countChars } from '@edtc/shared'
import { css, cva } from 'styled-system/css'

const countStyle = cva({
  base: { fontVariantNumeric: 'tabular-nums' },
  variants: {
    state: {
      ok: { color: 'fg.subtle' },
      short: { color: 'warning.fg' },
      over: { color: 'danger.fg', fontWeight: '600' },
    },
  },
})

/** 入力欄の下に出す文字数。上限を超えたら赤、最低文字数に届かなければ黄色。範囲外なら隣に注意も出す（未入力は注意なし） */
export function CharCount({ value, min, max }: { value: string; min?: number; max: number }) {
  const count = countChars(value)
  const state = count > max ? 'over' : min !== undefined && count < min ? 'short' : 'ok'
  const warning = count > max ? '文字が多すぎます！' : min !== undefined && count > 0 && count < min ? '文字が足りません！' : null
  return (
    <span className={css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'sm' })}>
      {warning && <span className={css({ fontSize: 'xs', fontWeight: '600', color: 'danger.fg' })}>{warning}</span>}
      <span className={countStyle({ state })}>
        {count} / {max}字{min !== undefined && `（${min}字以上）`}
      </span>
    </span>
  )
}
