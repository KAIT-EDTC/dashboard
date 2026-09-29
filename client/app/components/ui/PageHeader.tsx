import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { ChevronLeftIcon } from './Icons'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className={css({ mb: 'xl' })}>
      {back && (
        <Link
          to={back.to}
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            mb: 'sm',
            fontSize: 'sm',
            color: 'fg.muted',
            _hover: { color: 'fg' },
          })}
        >
          <ChevronLeftIcon size={16} />
          {back.label}
        </Link>
      )}
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'md',
          pb: 'md',
          borderBottomWidth: '1px',
        })}
      >
        <div>
          <h1 className={css({ fontSize: '2xl', fontWeight: '700' })}>{title}</h1>
          {description && <p className={css({ mt: '4px', fontSize: 'sm', color: 'fg.muted' })}>{description}</p>}
        </div>
        {actions && <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>{actions}</div>}
      </div>
    </header>
  )
}
