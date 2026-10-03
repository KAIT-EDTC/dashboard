import { type ReactNode, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { css, cx } from 'styled-system/css'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { BellIcon, CalendarIcon, HomeIcon, ListIcon, LogOutIcon, PenIcon, SlidersIcon, TagIcon, UserIcon, UsersIcon } from '../ui/Icons'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: HomeIcon, end: true },
  { to: '/events', label: 'イベント', icon: CalendarIcon, end: false },
  { to: '/blog', label: 'ブログ', icon: PenIcon, end: false },
  { to: '/members', label: 'メンバー', icon: UsersIcon, end: false },
]
const ADMIN_NAV_ITEMS = [
  { to: '/admin/users', label: 'ユーザー管理', icon: UserIcon, end: false },
  { to: '/admin/notifications', label: '通知設定', icon: BellIcon, end: false },
  { to: '/admin/categories', label: '種類・種別', icon: ListIcon, end: false },
  { to: '/admin/blog-tags', label: 'タグ管理', icon: TagIcon, end: false },
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

const tabStyle = css({
  flex: 1,
  minW: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  minH: '56px',
  fontSize: '11px',
  fontWeight: '500',
  color: 'fg.muted',
  bg: 'transparent',
  cursor: 'pointer',
  _hover: { color: 'fg' },
})
const tabActiveStyle = css({ color: 'accent.fg', fontWeight: '600' })

/** スマホ幅の下部タブバー（管理者メニューは「管理」から開く） */
function MobileTabBar({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const adminActive = pathname.startsWith('/admin')

  return (
    <div className={css({ display: { base: 'block', md: 'none' }, position: 'relative', flexShrink: 0 })}>
      {open && (
        <>
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
            className={css({ position: 'fixed', inset: 0, zIndex: 10, bg: 'transparent', cursor: 'default' })}
          />
          <div
            className={css({
              position: 'absolute',
              right: 'sm',
              bottom: '100%',
              mb: 'xs',
              zIndex: 11,
              minW: '200px',
              p: 'xs',
              display: 'flex',
              flexDirection: 'column',
              bg: 'surface',
              borderWidth: '1px',
              borderRadius: 'lg',
              shadow: 'island',
            })}
          >
            {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cx(navLinkStyle, css({ py: 'md' }), isActive && navLinkActiveStyle)}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </>
      )}
      <nav
        aria-label="メインメニュー"
        className={css({ display: 'flex', bg: 'sidebar', borderTopWidth: '1px', pb: 'env(safe-area-inset-bottom)' })}
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(tabStyle, isActive && tabActiveStyle)}>
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cx(tabStyle, (open || adminActive) && tabActiveStyle)}
          >
            <SlidersIcon size={22} />
            管理
          </button>
        )}
      </nav>
    </div>
  )
}

/** ログイン後の画面の枠（ヘッダー・ナビゲーション・本文） */
export function AppShell({ user, onLogout, children }: { user: ShellUser; onLogout: () => void; children: ReactNode }) {
  return (
    <div className={css({ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' })}>
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
              display: { base: 'none', md: 'flex' },
              flexDirection: 'column',
              gap: 'xs',
              p: 'sm',
              pt: 'md',
              w: '220px',
              flexShrink: 0,
              bg: 'sidebar',
              borderRightWidth: '1px',
            })}
          >
            {(user.role === 'admin' ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS).map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(navLinkStyle, isActive && navLinkActiveStyle)}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className={css({ flex: 1, minW: 0, overflowY: 'auto', p: { base: 'md', md: '2xl' } })}>{children}</div>
          <MobileTabBar isAdmin={user.role === 'admin'} />
        </div>
      </main>
    </div>
  )
}
