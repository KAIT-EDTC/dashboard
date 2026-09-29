import { Outlet } from 'react-router'
import { AppShell } from '~/components/layout/AppShell'
import { useLogout } from '~/features/auth/use-logout'
import { api, unwrap } from '~/lib/api'
import type { Route } from './+types/app-layout'

/** 未ログインなら unwrap が /login へリダイレクトする */
export async function clientLoader() {
  return { me: await unwrap(api.members.me.$get()) }
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const logout = useLogout()
  return (
    <AppShell user={loaderData.me} onLogout={logout}>
      <Outlet />
    </AppShell>
  )
}
