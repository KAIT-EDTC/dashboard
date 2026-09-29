import type { ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Logo } from './Logo'

/** ログイン前の画面（ログイン・新規登録）の枠 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className={css({ minH: '100vh', display: 'flex', flexDirection: 'column' })}>
      <header className={css({ h: '56px', px: 'lg', display: 'flex', alignItems: 'center', bg: 'surface', shadow: 'header' })}>
        <Logo />
      </header>
      <main className={css({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 'md' })}>
        <div
          className={css({
            w: 'full',
            maxW: '560px',
            p: { base: 'lg', md: '2xl' },
            bg: 'surface',
            borderRadius: '2xl',
            shadow: 'island',
            animation: 'fadeInUp 0.4s ease',
          })}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
