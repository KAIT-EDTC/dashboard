import type { ReactNode } from 'react'
import { css } from 'styled-system/css'

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'sm',
        py: 'xl',
        px: 'md',
        textAlign: 'center',
        color: 'fg.subtle',
      })}
    >
      {icon}
      <p className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted' })}>{title}</p>
      {children && <div className={css({ fontSize: 'sm' })}>{children}</div>}
    </div>
  )
}
