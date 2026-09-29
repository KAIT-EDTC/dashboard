import { css } from 'styled-system/css'
import { LogoIcon } from '../ui/Icons'

export function Logo() {
  return (
    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm', color: 'fg' })}>
      <LogoIcon size={26} className={css({ color: 'accent' })} />
      <span className={css({ fontSize: 'lg', fontWeight: '700', letterSpacing: '-0.02em' })}>EDTC ダッシュボード</span>
    </span>
  )
}
