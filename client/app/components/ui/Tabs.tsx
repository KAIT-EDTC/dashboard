import { Link } from 'react-router'
import { css, cx } from 'styled-system/css'

const tabStyle = css({
  px: 'md',
  h: '34px',
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 'sm',
  fontWeight: '600',
  color: 'fg.muted',
  borderRadius: 'md',
  _hover: { color: 'fg' },
})
const activeStyle = css({ bg: 'surface', color: 'fg', shadow: 'card', _hover: { color: 'fg' } })

/** URL（クエリ）で切り替えるタブ */
export function TabLinks({ items }: { items: { to: string; label: string; active: boolean }[] }) {
  return (
    <nav className={css({ display: 'inline-flex', gap: '2px', p: '3px', bg: 'surface.muted', borderRadius: 'lg' })}>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          replace
          preventScrollReset
          aria-current={item.active ? 'page' : undefined}
          className={cx(tabStyle, item.active && activeStyle)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
