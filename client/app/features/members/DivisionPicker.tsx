import { DIVISIONS, type Division } from '@edtc/shared'
import type { ReactNode } from 'react'
import { css } from 'styled-system/css'
import { ChipCheckbox } from '~/components/ui/Field'

type Props = {
  defaultValue?: Division[]
  error?: string
  /** 送信するフィールド名 */
  name?: string
  label?: ReactNode
  hint?: ReactNode
  required?: boolean
  /** チェックが変わるたびに、選ばれている部署を受け取る */
  onChange?: (divisions: Division[]) => void
}

/** 部署の複数選択（兼部対応）。既定では所属部署として name="divisions" で送信される */
export function DivisionPicker({
  defaultValue = [],
  error,
  name = 'divisions',
  label = '所属部署',
  hint = '兼部している場合は複数選べます',
  required = true,
  onChange,
}: Props) {
  return (
    <fieldset
      onChange={
        onChange &&
        ((e) => {
          const checked = e.currentTarget.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)
          onChange(DIVISIONS.filter((division) => [...checked].some((input) => input.value === division)))
        })
      }
      className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}
    >
      <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>
        {label}
        {required && <span className={css({ color: 'danger', ml: '2px' })}>*</span>}
        {hint && <span className={css({ fontWeight: '400', color: 'fg.subtle', ml: 'sm' })}>{hint}</span>}
      </legend>
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>
        {DIVISIONS.map((division) => (
          <ChipCheckbox key={division} name={name} value={division} label={division} defaultChecked={defaultValue.includes(division)} />
        ))}
      </div>
      {error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{error}</p>}
    </fieldset>
  )
}
