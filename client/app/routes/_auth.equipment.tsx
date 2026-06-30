import { css } from '../../styled-system/css'

export default function EquipmentPage() {
  return (
    <>
      <h1
        className={css({
          fontSize: '1.25rem',
          fontWeight: '600',
          color: 'text.primary',
          pb: 'md',
          mb: 'xl',
          borderBottom: '1px solid',
          borderColor: 'border.DEFAULT',
        })}
      >
        備品管理
      </h1>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 'md',
          py: '3xl',
        })}
      >
        <span className={css({ fontSize: '3rem' })}>📦</span>
        <h2
          className={css({
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'text.primary',
          })}
        >
          備品管理
        </h2>
        <p
          className={css({
            fontSize: '0.875rem',
            color: 'text.muted',
          })}
        >
          この機能は現在準備中です
        </p>
      </div>
    </>
  )
}
