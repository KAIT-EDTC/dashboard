import { RATING_LABELS, RATING_MAX, RATING_MIN } from '@edtc/shared'
import type { ReactNode } from 'react'
import { css, cva } from 'styled-system/css'

const STEPS = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i)

/** 並んだボタンで1つ選ぶ（活動評価・主催/参加） */
export const choiceStyle = css({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  h: '44px',
  fontSize: 'md',
  fontWeight: '700',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'md',
  cursor: 'pointer',
  color: 'fg.muted',
  '&:has(input:checked)': { borderColor: 'accent', bg: 'accent.subtle', color: 'accent.fg' },
  '&:has(input:focus-visible)': { shadow: 'focus' },
})

/** 両端の「悪」「良」 */
const endLabelStyle = css({ flexShrink: 0, fontSize: 'sm', fontWeight: '600', color: 'fg.muted' })

/** 活動評価の入力（悪 1〜5 良）。出欠と同じ並んだボタンで選ぶ */
export function RatingInput({
  label,
  value,
  onChange,
  error,
}: {
  label: ReactNode
  value: number | null
  onChange: (value: number) => void
  error?: string
}) {
  return (
    <fieldset className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}>
      <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>
        {label}
        <span className={css({ color: 'danger', ml: '2px' })}>*</span>
      </legend>
      <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm', maxW: '480px' })}>
        <span className={endLabelStyle}>{RATING_LABELS.min}</span>
        {STEPS.map((step) => (
          <label key={step} className={choiceStyle}>
            <input
              type="radio"
              name="rating"
              value={step}
              checked={value === step}
              onChange={() => onChange(step)}
              className={css({ srOnly: true })}
            />
            {step}
          </label>
        ))}
        <span className={endLabelStyle}>{RATING_LABELS.max}</span>
      </div>
      {error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{error}</p>}
    </fieldset>
  )
}

const segmentStyle = cva({
  base: { w: '10px', h: '6px', borderRadius: 'full' },
  variants: { filled: { true: { bg: 'accent' }, false: { bg: 'surface.hover' } } },
})

/** 活動評価の表示（5段のメーター） */
export function RatingMeter({ value, label = '活動評価' }: { value: number | null; label?: string }) {
  if (!value) return <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>未評価</span>
  return (
    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs' })} title={`${label} ${value} / ${RATING_MAX}`}>
      <span aria-hidden="true" className={css({ display: 'inline-flex', gap: '2px' })}>
        {STEPS.map((step) => (
          <span key={step} className={segmentStyle({ filled: step <= value })} />
        ))}
      </span>
      <span className={css({ fontSize: 'xs', color: 'fg.muted', fontVariantNumeric: 'tabular-nums' })}>
        {value} / {RATING_MAX}
      </span>
    </span>
  )
}
