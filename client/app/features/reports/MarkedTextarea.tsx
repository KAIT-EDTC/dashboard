import { useRef, type ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Field } from '~/components/ui/Field'
import { segmentsOf } from './CommentableText'

const frameStyle = css({
  position: 'relative',
  bg: 'surface.subtle',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'md',
  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  '&:focus-within': { borderColor: 'border.focus', bg: 'surface', shadow: 'focus' },
  '&:has(textarea[aria-invalid=true])': { borderColor: 'danger' },
})

// 印のレイヤーと入力欄は、文字の折り返しが完全に一致するよう同じ指定にする
const backdropStyle = css({
  position: 'absolute',
  inset: '0',
  px: '12px',
  py: '8px',
  fontFamily: 'inherit',
  fontSize: 'sm',
  lineHeight: '1.7',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  color: 'transparent',
  overflow: 'hidden',
  scrollbarGutter: 'stable',
  pointerEvents: 'none',
})

const textareaStyle = css({
  position: 'relative',
  display: 'block',
  w: 'full',
  px: '12px',
  py: '8px',
  fontFamily: 'inherit',
  fontSize: 'sm',
  lineHeight: '1.7',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  color: 'fg',
  bg: 'transparent',
  borderWidth: '0',
  outline: 'none',
  resize: 'vertical',
  scrollbarGutter: 'stable',
  _placeholder: { color: 'fg.subtle' },
})

const markStyle = css({
  color: 'transparent',
  bg: 'danger.subtle',
  borderRadius: '2px',
  textDecorationLine: 'underline',
  textDecorationStyle: 'wavy',
  textDecorationColor: 'danger',
  textUnderlineOffset: '3px',
})

type Props = {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  /** 赤い印を付ける範囲（修正依頼の箇所） */
  marks: { start: number; end: number }[]
  rows: number
  placeholder?: string
  required?: boolean
  error?: string
  hint?: ReactNode
  textareaRef?: (el: HTMLTextAreaElement | null) => void
}

/** 修正依頼の箇所に赤い印が付く入力欄（印は入力欄の後ろに重ねたレイヤーに描く） */
export function MarkedTextarea({ label, value, onChange, marks, rows, placeholder, required, error, hint, textareaRef }: Props) {
  const backdrop = useRef<HTMLDivElement>(null)
  const syncScroll = (el: HTMLTextAreaElement) => {
    if (backdrop.current) backdrop.current.scrollTop = el.scrollTop
  }
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a11y) => (
        <div className={frameStyle}>
          <div ref={backdrop} aria-hidden="true" className={backdropStyle}>
            {segmentsOf(value, marks.map((m) => ({ ...m, tone: 'request' as const }))).map((segment) =>
              segment.tone ? (
                <mark key={segment.start} className={markStyle}>
                  {value.slice(segment.start, segment.end)}
                </mark>
              ) : (
                value.slice(segment.start, segment.end)
              ),
            )}
            {/* 末尾の改行の分の高さをそろえる */}
            {'\n'}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.currentTarget.value)
              syncScroll(e.currentTarget)
            }}
            onScroll={(e) => syncScroll(e.currentTarget)}
            rows={rows}
            placeholder={placeholder}
            required={required}
            className={textareaStyle}
            {...a11y}
          />
        </div>
      )}
    </Field>
  )
}
