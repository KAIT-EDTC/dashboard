import { css } from 'styled-system/css'
import { BrandIcon } from './BrandIcon'

export function Logo() {
  return (
    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm', color: 'fg' })}>
      <BrandIcon size={32} />
      <span className={css({ fontSize: 'lg', fontWeight: '700', letterSpacing: '-0.02em' })}>EDTC ダッシュボード</span>
    </span>
  )
}
