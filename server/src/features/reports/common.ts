import { and, eq, inArray } from 'drizzle-orm'
import type { Context } from 'hono'
import { approvalStepsFor, isLeader, type Division, type ReportKind, type ReportStatus } from '@edtc/shared'
import type { Db } from '../../db'
import { activityReports, events, userDivisions, users } from '../../db/schema'
import type { AppEnv, Session } from '../../env'
import { runInBackground } from '../../lib/background'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { isApprover } from '../../middleware/auth'
import { notifyAwaitingReview } from './notifications'

/** 活動報告書・まとめ報告書で共通の、提出と承認まわりの処理 */

export type ReportRow = typeof activityReports.$inferSelect

/** 本人が編集できる状態 */
export const EDITABLE: ReportStatus[] = ['draft', 'rejected']

export async function findReport(db: Db, id: string, kind?: ReportKind): Promise<ReportRow> {
  const report = await db.select().from(activityReports).where(eq(activityReports.id, id)).get()
  if (!report || (kind && report.kind !== kind)) throw notFound('報告書が見つかりません')
  return report
}

/** 承認済みはメンバー全員、それ以外は本人と承認の流れにいる人（部署長・本部長・代表）だけが見られる */
export function canView(session: Session, report: ReportRow): boolean {
  if (report.status === 'approved' || report.authorId === session.userId) return true
  return report.status !== 'draft' && isApprover(session, report)
}

export function assertEditable(session: Session, report: ReportRow) {
  if (report.authorId !== session.userId) throw forbidden()
  if (!EDITABLE.includes(report.status)) throw conflict('提出済みの報告書は編集できません')
}

/** 所属部署は本人が所属している部署から選ぶ */
export async function assertOwnDivision(db: Db, userId: string, division: Division | null) {
  if (!division) return
  const row = await db
    .select({ division: userDivisions.division })
    .from(userDivisions)
    .where(and(eq(userDivisions.userId, userId), eq(userDivisions.division, division)))
    .get()
  if (!row) throw badRequest('所属していない部署は選べません。プロフィールの所属部署を確認してください。')
}

/** 役職者が選ぶ承認者は、自分以外の部署長・本部長・代表 */
export async function assertApprover(db: Db, userId: string, approverId: string | null) {
  if (!approverId) return
  const approver = await db.select({ headOf: users.headOf, officer: users.officer }).from(users).where(eq(users.id, approverId)).get()
  if (approverId === userId || !approver || !isLeader(approver)) {
    throw badRequest('承認者は自分以外の部署長・本部長・代表から選んでください')
  }
}

/** 状態が変わっていないことを条件に更新する（同時に承認・再提出された場合に上書きしない） */
export async function updateIfUnchanged(db: Db, report: ReportRow, from: ReportStatus[], values: Partial<ReportRow>) {
  const updated = await db
    .update(activityReports)
    .set(values)
    .where(
      and(
        eq(activityReports.id, report.id),
        inArray(activityReports.status, from),
        eq(activityReports.currentStep, report.currentStep),
      ),
    )
    .returning({ id: activityReports.id })
  if (updated.length === 0) throw conflict('報告書の状態が変わりました。ページを再読み込みしてください。')
}

/** 通知に載せる報告書の要約 */
export async function summaryOf(db: Db, report: ReportRow) {
  const [event, author] = await Promise.all([
    db.select({ title: events.title }).from(events).where(eq(events.id, report.eventId)).get(),
    db.select({ lastName: users.lastName, firstName: users.firstName }).from(users).where(eq(users.id, report.authorId)).get(),
  ])
  return {
    id: report.id,
    kind: report.kind,
    authorId: report.authorId,
    eventTitle: event?.title ?? '',
    authorName: author ? `${author.lastName} ${author.firstName}` : '',
    division: report.division,
    approverId: report.approverId,
  }
}

/**
 * 提出する。部員は所属部署の部署長、役職者（部署長・本部長・代表）は自分で選んだ承認者が承認する。
 * input は提出時の内容（下書きの保存も兼ねる）
 */
export async function submitReport(
  c: Context<AppEnv>,
  db: Db,
  report: ReportRow,
  input: Partial<ReportRow> & { division: Division; approverId: string | null },
) {
  const session = c.get('session')
  const approvalSteps = approvalStepsFor(session)
  const designated = approvalSteps[0] === 'designated'
  if (designated && !input.approverId) throw badRequest('承認者を選んでください')
  const approverId = designated ? input.approverId : null
  await assertApprover(db, session.userId, approverId)
  await updateIfUnchanged(db, report, EDITABLE, {
    ...input,
    approverId,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    approvalSteps,
    currentStep: 0,
  })

  const summary = await summaryOf(db, { ...report, division: input.division, approverId })
  runInBackground(c, notifyAwaitingReview(c.env, db, summary, approvalSteps[0], report.status === 'rejected' ? 'resubmitted' : 'submitted'))
}
