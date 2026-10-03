import { and, asc, eq } from 'drizzle-orm'
import { memberSummaryColumns, type Db } from '../../db'
import { activityReports } from '../../db/schema'

/** イベント詳細に載せる承認済みの報告書（伝言事項は連絡事項として表示する） */
export function approvedReportsOf(db: Db, eventId: string) {
  return db.query.activityReports.findMany({
    columns: { id: true, authorId: true, division: true, content: true, rating: true, notes: true, reviewedAt: true },
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
