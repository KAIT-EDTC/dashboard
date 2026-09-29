import { and, asc, desc, eq, inArray, lte, ne, or, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  nowInJst,
  reportDraftSchema,
  reportReviewSchema,
  reportSubmitSchema,
  type Division,
  type ReportStatus,
} from '@edtc/shared'
import { createDb, memberSummaryColumns, type Db } from '../../db'
import { activityReports, eventParticipants, events, userDivisions, users } from '../../db/schema'
import type { AppEnv, Session } from '../../env'
import { runInBackground } from '../../lib/background'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { canReview, requireAuth } from '../../middleware/auth'
import { notifyReviewed, notifySubmitted } from './notifications'

type ReportRow = typeof activityReports.$inferSelect

/** 報告書の対象: 参加と回答した人か、当日出席した人 */
const isTargetParticipant = or(eq(eventParticipants.status, 'going'), eq(eventParticipants.attended, true))

/** 報告書の一覧に出すイベントの情報 */
const eventColumns = {
  eventId: events.id,
  eventTitle: events.title,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
}

const EDITABLE: ReportStatus[] = ['draft', 'rejected']

async function findReport(db: Db, id: string): Promise<ReportRow> {
  const report = await db.select().from(activityReports).where(eq(activityReports.id, id)).get()
  if (!report) throw notFound('報告書が見つかりません')
  return report
}

/** 承認済みはメンバー全員、それ以外は本人と承認できる人（部長・管理者）だけが見られる */
function canView(session: Session, report: ReportRow): boolean {
  if (report.status === 'approved' || report.authorId === session.userId) return true
  return report.status !== 'draft' && canReview(session, report)
}

function assertEditable(session: Session, report: ReportRow) {
  if (report.authorId !== session.userId) throw forbidden()
  if (!EDITABLE.includes(report.status)) throw conflict('提出済みの報告書は編集できません')
}

/** 所属部署は本人が所属している部署から選ぶ */
async function assertOwnDivision(db: Db, userId: string, division: Division | null) {
  if (!division) return
  const row = await db
    .select({ division: userDivisions.division })
    .from(userDivisions)
    .where(and(eq(userDivisions.userId, userId), eq(userDivisions.division, division)))
    .get()
  if (!row) throw badRequest('所属していない部署は選べません。プロフィールの所属部署を確認してください。')
}

/** 状態が変わっていないことを条件に更新する（同時に承認・再提出された場合に上書きしない） */
async function updateIfStatus(db: Db, report: ReportRow, from: ReportStatus[], values: Partial<ReportRow>) {
  const updated = await db
    .update(activityReports)
    .set(values)
    .where(and(eq(activityReports.id, report.id), inArray(activityReports.status, from)))
    .returning({ id: activityReports.id })
  if (updated.length === 0) throw conflict('報告書の状態が変わりました。ページを再読み込みしてください。')
}

export const reportsRoute = new Hono<AppEnv>()
  .use(requireAuth)

  // 報告書を書ける（開始済みで自分が参加した）イベントと、自分の報告書の状態
  .get('/targets', async (c) => {
    const { userId } = c.get('session')
    const targets = await createDb(c.env)
      .select({
        ...eventColumns,
        location: events.location,
        role: eventParticipants.role,
        reportId: activityReports.id,
        reportStatus: activityReports.status,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .leftJoin(activityReports, and(eq(activityReports.eventId, events.id), eq(activityReports.authorId, userId)))
      .where(and(eq(eventParticipants.userId, userId), isTargetParticipant, lte(events.startsAt, nowInJst())))
      .orderBy(desc(events.startsAt))
      .limit(50)
    return c.json({ targets })
  })

  .get('/mine', async (c) => {
    const reports = await createDb(c.env)
      .select({
        id: activityReports.id,
        status: activityReports.status,
        division: activityReports.division,
        updatedAt: activityReports.updatedAt,
        ...eventColumns,
      })
      .from(activityReports)
      .innerJoin(events, eq(events.id, activityReports.eventId))
      .where(eq(activityReports.authorId, c.get('session').userId))
      .orderBy(desc(activityReports.updatedAt))
    return c.json({ reports })
  })

  // 承認待ち（部長は自分の部署の分、管理者はすべて）
  .get('/review', async (c) => {
    const session = c.get('session')
    if (session.role !== 'admin' && session.headOf.length === 0) return c.json({ reports: [] })

    const where: SQL[] = [eq(activityReports.status, 'submitted'), ne(activityReports.authorId, session.userId)]
    if (session.role !== 'admin') where.push(inArray(activityReports.division, session.headOf))

    const reports = await createDb(c.env).query.activityReports.findMany({
      columns: { id: true, status: true, division: true, submittedAt: true },
      with: {
        author: { columns: memberSummaryColumns },
        event: { columns: { id: true, title: true, startsAt: true, endsAt: true } },
      },
      where: and(...where),
      orderBy: asc(activityReports.submittedAt),
    })
    return c.json({ reports })
  })

  // 下書きを作る（すでにあればそれを返す）
  .post('/', validate('json', z.object({ eventId: z.string() })), async (c) => {
    const { eventId } = c.req.valid('json')
    const { userId } = c.get('session')
    const db = createDb(c.env)

    const existing = await db
      .select({ id: activityReports.id })
      .from(activityReports)
      .where(and(eq(activityReports.eventId, eventId), eq(activityReports.authorId, userId)))
      .get()
    if (existing) return c.json({ id: existing.id }, 200)

    const participation = await db
      .select({ startsAt: events.startsAt })
      .from(eventParticipants)
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId), isTargetParticipant))
      .get()
    if (!participation) throw forbidden('このイベントに参加した人だけが報告書を書けます')
    if (participation.startsAt > nowInJst()) throw badRequest('報告書はイベントが始まってから書けます')

    // 所属部署が1つなら最初から選んでおく
    const divisions = await db
      .select({ division: userDivisions.division })
      .from(userDivisions)
      .where(eq(userDivisions.userId, userId))
    const id = crypto.randomUUID()
    await db.insert(activityReports).values({
      id,
      eventId,
      authorId: userId,
      division: divisions.length === 1 ? divisions[0].division : null,
    })
    return c.json({ id }, 201)
  })

  .get('/:id', async (c) => {
    const session = c.get('session')
    const db = createDb(c.env)
    const row = await db.query.activityReports.findFirst({
      where: eq(activityReports.id, c.req.param('id')),
      with: {
        author: { columns: { ...memberSummaryColumns, studentId: true } },
        reviewer: { columns: memberSummaryColumns },
        event: { columns: { id: true, title: true, startsAt: true, endsAt: true, location: true } },
      },
    })
    if (!row || !canView(session, row)) throw notFound('報告書が見つかりません')

    const participant = await db
      .select({ role: eventParticipants.role })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, row.eventId), eq(eventParticipants.userId, row.authorId)))
      .get()

    // 学籍番号は本人と承認できる人にだけ見せる
    const isAuthor = row.authorId === session.userId
    const reviewer = canReview(session, row)
    const { studentId, ...author } = row.author
    return c.json({
      report: { ...row, author: { ...author, studentId: isAuthor || reviewer ? studentId : null } },
      authorRole: participant?.role ?? null,
      canEdit: isAuthor && EDITABLE.includes(row.status),
      canDelete: isAuthor && row.status === 'draft',
      canReview: reviewer && row.status === 'submitted',
    })
  })

  // 下書き保存（差し戻し中の修正もここ）
  .put('/:id', validate('json', reportDraftSchema), async (c) => {
    const session = c.get('session')
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'))
    assertEditable(session, report)
    await assertOwnDivision(db, session.userId, input.division)
    await updateIfStatus(db, report, EDITABLE, input)
    return c.json({ ok: true })
  })

  .post('/:id/submit', validate('json', reportSubmitSchema), async (c) => {
    const session = c.get('session')
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'))
    assertEditable(session, report)
    await assertOwnDivision(db, session.userId, input.division)
    await updateIfStatus(db, report, EDITABLE, { ...input, status: 'submitted', submittedAt: new Date().toISOString() })

    const [event, author] = await Promise.all([
      db.select({ title: events.title }).from(events).where(eq(events.id, report.eventId)).get(),
      db.select({ lastName: users.lastName, firstName: users.firstName }).from(users).where(eq(users.id, session.userId)).get(),
    ])
    runInBackground(
      c,
      notifySubmitted(
        c.env,
        {
          id: report.id,
          eventTitle: event?.title ?? '',
          authorName: author ? `${author.lastName} ${author.firstName}` : '',
          division: input.division,
        },
        report.status === 'rejected',
      ),
    )
    return c.json({ ok: true })
  })

  .post('/:id/review', validate('json', reportReviewSchema), async (c) => {
    const session = c.get('session')
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'))
    if (!canReview(session, report)) throw forbidden()
    if (report.status !== 'submitted') throw conflict('承認待ちの報告書ではありません')

    const reviewed = { reviewerId: session.userId, reviewedAt: new Date().toISOString() }
    await updateIfStatus(
      db,
      report,
      ['submitted'],
      input.decision === 'approve'
        ? { ...reviewed, status: 'approved', rejectionFields: [], rejectionComment: '' }
        : { ...reviewed, status: 'rejected', rejectionFields: input.fields, rejectionComment: input.comment },
    )

    const [event, reviewer] = await Promise.all([
      db.select({ title: events.title }).from(events).where(eq(events.id, report.eventId)).get(),
      db.select({ lastName: users.lastName, firstName: users.firstName }).from(users).where(eq(users.id, session.userId)).get(),
    ])
    runInBackground(
      c,
      notifyReviewed(c.env, {
        id: report.id,
        authorId: report.authorId,
        eventTitle: event?.title ?? '',
        reviewerName: reviewer ? `${reviewer.lastName} ${reviewer.firstName}` : '',
        decision: input.decision,
        comment: input.decision === 'reject' ? input.comment : '',
      }),
    )
    return c.json({ ok: true })
  })

  .delete('/:id', async (c) => {
    const session = c.get('session')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'))
    if (report.authorId !== session.userId) throw forbidden()
    if (report.status !== 'draft') throw conflict('削除できるのは下書きだけです')
    await db.delete(activityReports).where(and(eq(activityReports.id, report.id), eq(activityReports.status, 'draft')))
    return c.json({ ok: true })
  })

