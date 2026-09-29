import type { ReactNode } from 'react'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { css } from 'styled-system/css'
import { LoadingScreen } from './components/ui/Spinner'
import type { Route } from './+types/root'
import './app.css'

export const meta: Route.MetaFunction = () => [
  { title: 'EDTC ダッシュボード' },
  { name: 'description', content: 'EDTCメンバー専用ダッシュボード。イベント・ブログ・メンバー交流をひとつに。' },
]

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}

export function HydrateFallback() {
  return <LoadingScreen />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (!notFound) console.error(error)
  return (
    <div className={css({ minH: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'md', p: 'lg', textAlign: 'center' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: '700' })}>{notFound ? 'ページが見つかりません' : 'エラーが発生しました'}</h1>
      <p className={css({ color: 'fg.muted' })}>{notFound ? 'お探しのページは存在しません。' : '時間をおいて再読み込みしてください。'}</p>
      <a href="/">ホームに戻る</a>
    </div>
  )
}
