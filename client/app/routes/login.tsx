import { redirect } from 'react-router'
import { PublicShell } from '~/components/layout/PublicShell'
import { LoginCard } from '~/features/auth/LoginCard'
import { LOGIN_ERROR_MESSAGES } from '~/features/auth/login-errors'
import { api } from '~/lib/api'
import type { Route } from './+types/login'

export const meta: Route.MetaFunction = () => [{ title: 'ログイン | EDTC ダッシュボード' }]

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  // ログイン済みならホームへ
  const res = await api.members.me.$get().catch(() => null)
  if (res?.ok) throw redirect('/')

  const error = new URL(request.url).searchParams.get('error')
  return { errorMessage: error ? (LOGIN_ERROR_MESSAGES[error as keyof typeof LOGIN_ERROR_MESSAGES] ?? null) : null }
}

export default function LoginPage({ loaderData }: Route.ComponentProps) {
  return (
    <PublicShell>
      <LoginCard errorMessage={loaderData.errorMessage} />
    </PublicShell>
  )
}
