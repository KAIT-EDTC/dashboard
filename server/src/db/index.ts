import { drizzle } from 'drizzle-orm/d1'
import type { Bindings } from '../env'
import * as schema from './schema'

export function createDb(env: Pick<Bindings, 'DB'>) {
  return drizzle(env.DB, { schema })
}

export type Db = ReturnType<typeof createDb>

/** 他のメンバーに見せてよい最小限のユーザー情報 */
export const memberSummaryColumns = {
  id: true,
  discordUsername: true,
  discordAvatar: true,
  lastName: true,
  firstName: true,
  nickname: true,
} as const
