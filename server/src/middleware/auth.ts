import { eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import { canApproveStep, type ApprovalStep, type Division } from '@edtc/shared'
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
    .select({ id: users.id, role: users.role, headOf: users.headOf, officer: users.officer })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!user) throw unauthorized()

  c.set('session', { userId: user.id, role: user.role, headOf: user.headOf, officer: user.officer })
  await next()
})

/** 管理者か、そのデータの作成者であれば編集できる */
export function canManage(session: Session, ownerId: string): boolean {
  return session.role === 'admin' || session.userId === ownerId
}

export function assertCanManage(session: Session, ownerId: string) {
  if (!canManage(session, ownerId)) throw forbidden()
}

export function assertAdmin(session: Session) {
  if (session.role !== 'admin') throw forbidden()
}

type ReviewTarget = { authorId: string; division: Division | null; approverId: string | null; approvalSteps: ApprovalStep[] }

/** 活動報告書のその段階を承認・修正依頼できるか（自分の報告書は除く。管理者は関わらない） */
export function canReviewStep(session: Session, report: ReviewTarget, step: ApprovalStep | undefined): boolean {
  if (!step || report.authorId === session.userId) return false
  return canApproveStep({ ...session, id: session.userId }, step, report)
}

/** 承認の流れのどこかを担当している（提出後の報告書を見られる） */
export function isApprover(session: Session, report: ReviewTarget): boolean {
  return report.approvalSteps.some((step) => canReviewStep(session, report, step))
}
