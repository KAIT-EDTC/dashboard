import type { InferResponseType } from 'hono/client'
import { useRouteLoaderData } from 'react-router'
import type { api } from '~/lib/api'

export type CurrentUser = InferResponseType<typeof api.members.me.$get, 200>

/** ログイン中のユーザー（routes/app-layout.tsx の配下でのみ使える） */
export function useCurrentUser(): CurrentUser {
  const data = useRouteLoaderData<{ me: CurrentUser }>('app')
  if (!data) throw new Error('useCurrentUser は認証済みレイアウトの中で使ってください')
  return data.me
}
