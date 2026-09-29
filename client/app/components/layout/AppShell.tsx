import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { css, cx } from 'styled-system/css'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { CalendarIcon, FileTextIcon, HomeIcon, LogOutIcon, PenIcon, UsersIcon } from '../ui/Icons'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: HomeIcon, end: true },
  { to: '/events', label: 'イベント', icon: CalendarIcon, end: false },
  { to: '/reports', label: '報告書', icon: FileTextIcon, end: false },
  { to: '/blog', label: 'ブログ', icon: PenIcon, end: false },
  { to: '/members', label: 'メンバー', icon: UsersIcon, end: false },
]

type ShellUser = {
  id: string
  discordUsername: string
  discordAvatar: string | null
  lastName: string
  firstName: string
  role: 'member' | 'admin'
}

const navLinkStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: 'sm',
  px: 'md',
  py: 'sm',
  flexShrink: 0,
  borderRadius: 'md',
  fontSize: 'sm',
  fontWeight: '500',
  color: 'fg.muted',
  _hover: { bg: 'surface.hover', color: 'fg' },
})
const navLinkActiveStyle = css({
  bg: 'surface.selected',
  color: 'accent.fg',
  fontWeight: '600',
  _hover: { bg: 'surface.selected', color: 'accent.fg' },
})

/** ログイン後の画面の枠（ヘッダー・ナビゲーション・本文） */
export function AppShell({ user, onLogout, children }: { user: ShellUser; onLogout: () => void; children: ReactNode }) {
  return (
    <div className={css({ minH: '100vh', display: 'flex', flexDirection: 'column' })}>
      <header
        className={css({
          h: '56px',
          px: { base: 'md', md: 'lg' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'md',
          bg: 'surface',
          shadow: 'header',
          flexShrink: 0,
        })}
      >
        <Link to="/">
          <Logo />
        </Link>
        <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
          <Link
            to={`/members/${user.id}`}
            className={css({ display: 'flex', alignItems: 'center', gap: 'sm', color: 'fg', _hover: { color: 'fg' } })}
          >
            <Avatar user={user} size={30} />
            <span className={css({ display: { base: 'none', sm: 'inline' }, fontSize: 'sm', fontWeight: '600' })}>
              {user.lastName} {user.firstName}
            </span>
            {user.role === 'admin' && <Badge tone="accent">管理者</Badge>}
          </Link>
          <Button variant="ghost" size="sm" onClick={onLogout} aria-label="ログアウト">
            <LogOutIcon size={16} />
            <span className={css({ display: { base: 'none', md: 'inline' } })}>ログアウト</span>
          </Button>
        </div>
      </header>

      <main className={css({ flex: 1, display: 'flex', p: { base: 'sm', md: 'lg' }, minH: 0 })}>
        <div
          className={css({
            flex: 1,
            display: 'flex',
            flexDirection: { base: 'column', md: 'row' },
            bg: 'surface',
            borderRadius: '2xl',
            shadow: 'island',
            overflow: 'hidden',
          })}
        >
          <nav
            aria-label="メインメニュー"
            className={css({
              display: 'flex',
              flexDirection: { base: 'row', md: 'column' },
              gap: 'xs',
              p: 'sm',
              pt: { md: 'md' },
              w: { md: '220px' },
              flexShrink: 0,
              overflowX: 'auto',
              bg: 'sidebar',
              borderRightWidth: { md: '1px' },
              borderBottomWidth: { base: '1px', md: '0' },
            })}
          >
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(navLinkStyle, isActive && navLinkActiveStyle)}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className={css({ flex: 1, minW: 0, overflowY: 'auto', p: { base: 'md', md: '2xl' } })}>{children}</div>
        </div>
      </main>
    </div>
  )
}
