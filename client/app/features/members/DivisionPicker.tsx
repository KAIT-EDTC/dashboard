import { DIVISIONS, type Division } from '@edtc/shared'
import { css } from 'styled-system/css'
import { ChipCheckbox } from '~/components/ui/Field'

/** 部署の複数選択（兼部対応）。name="divisions" で送信される */
export function DivisionPicker({ defaultValue = [], error }: { defaultValue?: Division[]; error?: string }) {
  return (
    <fieldset className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}>
      <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>
        所属部署<span className={css({ color: 'danger', ml: '2px' })}>*</span>
        <span className={css({ fontWeight: '400', color: 'fg.subtle', ml: 'sm' })}>兼部している場合は複数選べます</span>
      </legend>
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>
        {DIVISIONS.map((division) => (
          <ChipCheckbox key={division} name="divisions" value={division} label={division} defaultChecked={defaultValue.includes(division)} />
        ))}
      </div>
      {error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{error}</p>}
    </fieldset>
  )
}
