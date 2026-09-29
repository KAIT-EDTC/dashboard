import type { ReactNode } from 'react'
import { css, cx } from 'styled-system/css'

export const cardStyle = css({
  bg: 'surface',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'lg',
  overflow: 'hidden',
})

type CardProps = {
  title?: ReactNode
  /** ヘッダー右側（リンクやボタン） */
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}

export function Card({ title, action, children, className, padded = true }: CardProps) {
  return (
    <section className={cx(cardStyle, className)}>
      {(title || action) && (
        <header
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'sm',
            px: 'lg',
            py: '12px',
            borderBottomWidth: '1px',
          })}
        >
          <h2 className={css({ fontSize: 'md', fontWeight: '600' })}>{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? css({ p: 'lg' }) : undefined}>{children}</div>
    </section>
  )
}
