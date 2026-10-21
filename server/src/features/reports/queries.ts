import { and, asc, eq, isNotNull, ne, or } from 'drizzle-orm'
import { canApproveStep, isLeader, positionLabels, type ApprovalStep, type Division } from '@edtc/shared'
import { memberSummaryColumns, type Db } from '../../db'
import { activityReports, eventParticipants, events, users } from '../../db/schema'
import { eventHasLecturer, rulesOf } from '../events/category-rules'

/** 報告書の対象: 参加と回答した人か、当日出席した人 */
export const isTargetParticipant = or(eq(eventParticipants.status, 'going'), eq(eventParticipants.attended, true))

/** isTargetParticipant と同じ条件を、読み込んだ参加者に当てはめる */
export const isReportTarget = (participant: Pick<typeof eventParticipants.$inferSelect, 'status' | 'attended'>) =>
  participant.status === 'going' || participant.attended

/** イベント詳細に載せる承認済みの報告書（伝言事項は連絡事項として表示する） */
export function approvedReportsOf(db: Db, eventId: string) {
  return db.query.activityReports.findMany({
    columns: { id: true, authorId: true, division: true, content: true, rating: true, notes: true, approvedAt: true },
    with: { author: { columns: memberSummaryColumns } },
    where: and(eq(activityReports.eventId, eventId), eq(activityReports.kind, 'activity'), eq(activityReports.status, 'approved')),
    orderBy: asc(activityReports.submittedAt),
  })
}

/** イベント詳細の「報告書を書く／見る」ボタン用 */
export function myReportOf(db: Db, eventId: string, userId: string) {
  return db
    .select({ id: activityReports.id, status: activityReports.status })
    .from(activityReports)
    .where(and(eq(activityReports.eventId, eventId), eq(activityReports.authorId, userId), eq(activityReports.kind, 'activity')))
    .get()
}

// --- まとめ報告書 -------------------------------------------------------------

/**
 * まとめ報告書を書く人（まだ書き始めていないとき）。講師を置く種類なら講師、置かない種類なら主催者が指名した人。
 * いなければ null。書き始めた後は、まとめ報告書を書いている人が担当者
 */
export async function summaryWriterIdOf(db: Db, event: { id: string; category: string; summaryWriterId: string | null }): Promise<string | null> {
  if (!(await rulesOf(db, event.category)).hasLecturer) return event.summaryWriterId
  const lecturer = await db
    .select({ userId: eventParticipants.userId })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.role, 'lecturer'), isTargetParticipant))
    .get()
  return lecturer?.userId ?? null
}

/** イベントのまとめ報告書（なければ undefined） */
export function summaryReportOf(db: Db, eventId: string) {
  return db
    .select({
      id: activityReports.id,
      authorId: activityReports.authorId,
      status: activityReports.status,
      approvalSteps: activityReports.approvalSteps,
      currentStep: activityReports.currentStep,
    })
    .from(activityReports)
    .where(and(eq(activityReports.eventId, eventId), eq(activityReports.kind, 'summary')))
    .get()
}

/**
 * まとめ報告書に載せる参加者と、それぞれの活動報告書（下書きは未提出として扱う）。
 * 並びは講師を先頭に、参加を回答した順
 */
export async function summaryMembersOf(db: Db, eventId: string) {
  const [event, participants, reports] = await Promise.all([
    db.select({ hasLecturer: eventHasLecturer }).from(events).where(eq(events.id, eventId)).get(),
    db.query.eventParticipants.findMany({
      columns: { userId: true, role: true },
      with: { user: { columns: { ...memberSummaryColumns, lastNameKana: true, firstNameKana: true, studentId: true } } },
      where: and(eq(eventParticipants.eventId, eventId), isTargetParticipant),
      orderBy: asc(eventParticipants.createdAt),
    }),
    db
      .select({
        id: activityReports.id,
        authorId: activityReports.authorId,
        status: activityReports.status,
        rating: activityReports.rating,
        reflection: activityReports.reflection,
      })
      .from(activityReports)
      .where(and(eq(activityReports.eventId, eventId), eq(activityReports.kind, 'activity'))),
  ])
  return participants
    .sort((a, b) => Number(b.role === 'lecturer') - Number(a.role === 'lecturer'))
    .map((p) => {
      const report = reports.find((r) => r.authorId === p.userId && r.status !== 'draft')
      // 講師を置かないイベントには役割がない
      return { user: p.user, role: event?.hasLecturer ? p.role : null, report: report ?? null }
    })
}
export type SummaryMember = Awaited<ReturnType<typeof summaryMembersOf>>[number]

/**
 * 提出済み（承認待ち・承認済み）の活動報告書の数と、提出が必要な人数。
 * まとめ報告書の担当者は活動報告書を書かなくてよいので数えない
 */
export function submissionProgress(members: SummaryMember[], writerId: string | null) {
  const required = members.filter((m) => m.user.id !== writerId)
  const submitted = required.filter((m) => m.report?.status === 'submitted' || m.report?.status === 'approved').length
  return { submitted, total: required.length }
}

/** まとめ報告書の担当者を決めるときに使うイベントの情報 */
export function findEventForSummary(db: Db, eventId: string) {
  return db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt, category: events.category, summaryWriterId: events.summaryWriterId, createdBy: events.createdBy })
    .from(events)
    .where(eq(events.id, eventId))
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
