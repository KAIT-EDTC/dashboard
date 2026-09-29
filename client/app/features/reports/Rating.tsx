import { RATING_LABELS, RATING_MAX, RATING_MIN } from '@edtc/shared'
import type { ReactNode } from 'react'
import { css, cva, cx } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'
import { Field } from '~/components/ui/Field'

const STEPS = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i)

/** 活動評価の入力（1: 悪 〜 5: 良）。未選択のあいだはつまみを真ん中に置き、触ったら値が入る */
export function RatingSlider({
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
  const middle = Math.round((RATING_MIN + RATING_MAX) / 2)
  const pick = (e: { currentTarget: HTMLInputElement }) => onChange(Number(e.currentTarget.value))
  return (
    <Field
      label={
        <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
          {label}
          <Badge tone={value ? 'accent' : 'neutral'}>{value ? `${value} / ${RATING_MAX}` : '未選択'}</Badge>
        </span>
      }
      error={error}
      required
    >
      {(a11y) => (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2px', px: 'xs' })}>
          <input
            type="range"
            min={RATING_MIN}
            max={RATING_MAX}
            step={1}
            value={value ?? middle}
            onChange={pick}
            onClick={pick}
            aria-valuetext={value ? `${value}（${RATING_MIN}が${RATING_LABELS.min}、${RATING_MAX}が${RATING_LABELS.max}）` : '未選択'}
            className={cx(
              css({ w: 'full', h: '24px', accentColor: 'accent', cursor: 'pointer' }),
              !value && css({ opacity: 0.5 }),
            )}
            {...a11y}
          />
          <div className={css({ display: 'flex', justifyContent: 'space-between', fontSize: 'xs', color: 'fg.subtle' })}>
            {STEPS.map((step) => (
              <span key={step} className={cx(css({ w: '2em', textAlign: 'center' }), step === value && css({ color: 'accent.fg', fontWeight: '700' }))}>
                {step}
                {step === RATING_MIN && <span className={css({ display: 'block' })}>{RATING_LABELS.min}</span>}
                {step === RATING_MAX && <span className={css({ display: 'block' })}>{RATING_LABELS.max}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </Field>
  )
}

const segmentStyle = cva({
  base: { w: '10px', h: '6px', borderRadius: 'full' },
  variants: { filled: { true: { bg: 'accent' }, false: { bg: 'surface.hover' } } },
})

/** 活動評価の表示（5段のメーター） */
export function RatingMeter({ value }: { value: number | null }) {
  if (!value) return <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>未評価</span>
  return (
    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs' })} title={`活動評価 ${value} / ${RATING_MAX}`}>
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
