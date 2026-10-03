import { and, asc, eq, isNotNull, ne, or } from 'drizzle-orm'
import { canApproveStep, isLeader, positionLabels, type ApprovalStep, type Division } from '@edtc/shared'
import { memberSummaryColumns, type Db } from '../../db'
import { activityReports, users } from '../../db/schema'

/** イベント詳細に載せる承認済みの報告書（伝言事項は連絡事項として表示する） */
export function approvedReportsOf(db: Db, eventId: string) {
  return db.query.activityReports.findMany({
    columns: { id: true, authorId: true, division: true, content: true, rating: true, notes: true, approvedAt: true },
    with: { author: { columns: memberSummaryColumns } },
    where: and(eq(activityReports.eventId, eventId), eq(activityReports.status, 'approved')),
    orderBy: asc(activityReports.submittedAt),
  })
}

/** イベント詳細の「報告書を書く／見る」ボタン用 */
export function myReportOf(db: Db, eventId: string, userId: string) {
  return db
    .select({ id: activityReports.id, status: activityReports.status })
    .from(activityReports)
    .where(and(eq(activityReports.eventId, eventId), eq(activityReports.authorId, userId)))
    .get()
}

/**
 * その段階を承認できるメンバー（DMの送り先）。役職はログイン時にDiscordロールから記録したものを使うので、
 * 役職に就いた人は一度ログインしておく必要がある
 */
export async function approverIdsOf(
  db: Db,
  step: ApprovalStep,
  report: { division: Division | null; approverId: string | null; authorId: string },
): Promise<string[]> {
  if (step === 'designated') return report.approverId ? [report.approverId] : []
  const leaders = await leadersExcept(db, report.authorId)
  return leaders.filter((user) => canApproveStep(user, step, report)).map((user) => user.id)
}

/** 役職者（部署長・本部長・代表）。自分以外 */
function leadersExcept(db: Db, userId: string) {
  return db
    .select({
      id: users.id,
      discordUsername: users.discordUsername,
      discordAvatar: users.discordAvatar,
      lastName: users.lastName,
      firstName: users.firstName,
      nickname: users.nickname,
      headOf: users.headOf,
      officer: users.officer,
    })
    .from(users)
    .where(and(ne(users.id, userId), or(isNotNull(users.officer), ne(users.headOf, []))))
}

/** 役職者が報告書の承認者として選べる人（自分以外の部署長・本部長・代表） */
export async function approverCandidatesFor(db: Db, userId: string) {
  const leaders = await leadersExcept(db, userId)
  return leaders
    .filter(isLeader)
    .map(({ headOf, officer, ...member }) => ({ ...member, positions: positionLabels({ headOf, officer }) }))
    .sort((a, b) => a.positions.join().localeCompare(b.positions.join(), 'ja'))
}
