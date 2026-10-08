import { useId, type ComponentProps, type ReactNode } from 'react'
import { css, cx } from 'styled-system/css'

export const inputStyle = css({
  w: 'full',
  px: '12px',
  py: '8px',
  fontSize: 'sm',
  color: 'fg',
  bg: 'surface.subtle',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'md',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  _placeholder: { color: 'fg.subtle' },
  _focus: { borderColor: 'border.focus', bg: 'surface', shadow: 'focus' },
  _disabled: { opacity: 0.6, cursor: 'not-allowed' },
  '&[aria-invalid=true]': { borderColor: 'danger' },
})

type FieldProps = {
  label: ReactNode
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
  /** 入力要素に渡す id と aria 属性を受け取って描画する */
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}

export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className={cx(css({ display: 'flex', flexDirection: 'column', gap: '6px' }), className)}>
      <label htmlFor={id} className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted' })}>
        {label}
        {required && <span className={css({ color: 'danger', ml: '2px' })}>*</span>}
      </label>
      {children({
        id,
        ...(error && { 'aria-invalid': true }),
        ...((error || hint) && { 'aria-describedby': messageId }),
      })}
      {(error || hint) && (
        <p id={messageId} className={css({ fontSize: 'xs', color: error ? 'danger.fg' : 'fg.subtle' })}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

type Common = { label: ReactNode; error?: string; hint?: ReactNode; className?: string }

export function TextField({ label, error, hint, className, ...props }: Common & ComponentProps<'input'>) {
  return (
    <Field label={label} error={error} hint={hint} required={props.required} className={className}>
      {(a11y) => <input className={inputStyle} {...a11y} {...props} />}
    </Field>
  )
}

export function TextareaField({ label, error, hint, className, ...props }: Common & ComponentProps<'textarea'>) {
  return (
    <Field label={label} error={error} hint={hint} required={props.required} className={className}>
      {(a11y) => <textarea className={cx(inputStyle, css({ resize: 'vertical', lineHeight: '1.7' }))} {...a11y} {...props} />}
    </Field>
  )
}

export function SelectField({ label, error, hint, className, ...props }: Common & ComponentProps<'select'>) {
  return (
    <Field label={label} error={error} hint={hint} required={props.required} className={className}>
      {(a11y) => <select className={inputStyle} {...a11y} {...props} />}
    </Field>
  )
}

/** チェックボックスをチップ状に見せる（複数選択用） */
export function ChipCheckbox({ label, ...props }: { label: ReactNode } & Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <label
      className={css({
        position: 'relative', // 隠しinputの基準。無いとフォーカス時に画面枠(overflow:hidden)がスクロールして崩れる
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'xs',
        px: '12px',
        h: '32px',
        fontSize: 'sm',
        fontWeight: '500',
        borderRadius: 'full',
        borderWidth: '1px',
        borderColor: 'border',
        bg: 'surface',
        color: 'fg.muted',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.15s',
        _hover: { borderColor: 'border.strong' },
        '&:has(input:checked)': { bg: 'accent.subtle', borderColor: 'accent', color: 'accent.fg' },
        '&:has(input:focus-visible)': { shadow: 'focus' },
      })}
    >
      <input type="checkbox" className={css({ srOnly: true })} {...props} />
      {label}
    </label>
  )
}

/** チェックボックス付きの一行 */
export function Checkbox({ label, ...props }: { label: ReactNode } & Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <label className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm', fontSize: 'sm', cursor: 'pointer' })}>
      <input type="checkbox" className={css({ w: '16px', h: '16px', accentColor: 'accent' })} {...props} />
      {label}
    </label>
  )
}
