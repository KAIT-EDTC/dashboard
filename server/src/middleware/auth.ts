import { eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import type { Division } from '@edtc/shared'
import { createDb } from '../db'
import { users } from '../db/schema'
import type { AppEnv, Session } from '../env'
import { forbidden, unauthorized } from '../lib/errors'
import { readSessionUserId } from '../features/auth/session'

/**
 * ログイン必須。ロールはDBから毎回読むため、退会（ユーザー削除）やロール変更が即座に反映される
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await readSessionUserId(c)
  if (!userId) throw unauthorized()

  const user = await createDb(c.env)
    .select({ id: users.id, role: users.role, headOf: users.headOf })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!user) throw unauthorized()

  c.set('session', { userId: user.id, role: user.role, headOf: user.headOf })
  await next()
})

/** 管理者か、そのデータの作成者であれば編集できる */
export function canManage(session: Session, ownerId: string): boolean {
  return session.role === 'admin' || session.userId === ownerId
}

export function assertCanManage(session: Session, ownerId: string) {
  if (!canManage(session, ownerId)) throw forbidden()
}

/** 活動報告書を承認・差し戻しできる: 報告した部署の部長か管理者（自分の報告書は除く） */
export function canReview(session: Session, report: { authorId: string; division: Division | null }): boolean {
  if (report.authorId === session.userId) return false
  return session.role === 'admin' || (!!report.division && session.headOf.includes(report.division))
}
