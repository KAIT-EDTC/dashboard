import { and, asc, desc, eq, inArray, lte, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  approvalStepsFor,
  isLeader,
  nowInJst,
  reportCreateSchema,
  reportDraftSchema,
  reportReviewSchema,
  reportSubmitSchema,
  type Division,
  type ReportStatus,
} from '@edtc/shared'
import { createDb, memberSummaryColumns, type Db } from '../../db'
import {
  activityReportComments,
  activityReportReviews,
  activityReports,
  eventParticipants,
  events,
  userDivisions,
  users,
} from '../../db/schema'
import type { AppEnv, Session } from '../../env'
import { runInBackground } from '../../lib/background'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { canReviewStep, isApprover, requireAuth } from '../../middleware/auth'
import { notifyApproved, notifyAwaitingReview, notifyRejected } from './notifications'
import { approverCandidatesFor } from './queries'

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

function findOwnReport(db: Db, eventId: string, userId: string) {
  return db
    .select({ id: activityReports.id })
    .from(activityReports)
    .where(and(eq(activityReports.eventId, eventId), eq(activityReports.authorId, userId)))
    .get()
}

/** 承認済みはメンバー全員、それ以外は本人と承認の流れにいる人（部署長・本部長・代表）だけが見られる */
function canView(session: Session, report: ReportRow): boolean {
  if (report.status === 'approved' || report.authorId === session.userId) return true
  return report.status !== 'draft' && isApprover(session, report)
}

function assertEditable(session: Session, report: ReportRow) {
  if (report.authorId !== session.userId) throw forbidden()
  if (!EDITABLE.includes(report.status)) throw conflict('提出済みの報告書は編集できません')
}

/** 報告書を書けるのは、参加したイベントが始まってから */
async function assertCanWrite(db: Db, eventId: string, userId: string) {
  const participation = await db
    .select({ startsAt: events.startsAt })
    .from(eventParticipants)
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId), isTargetParticipant))
    .get()
  if (!participation) throw forbidden('このイベントに参加した人だけが報告書を書けます')
  if (participation.startsAt > nowInJst()) throw badRequest('報告書はイベントが始まってから書けます')
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

/** 役職者が選ぶ承認者は、自分以外の部署長・本部長・代表 */
async function assertApprover(db: Db, userId: string, approverId: string | null) {
  if (!approverId) return
  const approver = await db.select({ headOf: users.headOf, officer: users.officer }).from(users).where(eq(users.id, approverId)).get()
  if (approverId === userId || !approver || !isLeader(approver)) {
    throw badRequest('承認者は自分以外の部署長・本部長・代表から選んでください')
  }
}

/** 状態が変わっていないことを条件に更新する（同時に承認・再提出された場合に上書きしない） */
async function updateIfUnchanged(db: Db, report: ReportRow, from: ReportStatus[], values: Partial<ReportRow>) {
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

async function summaryOf(db: Db, report: ReportRow) {
  const [event, author] = await Promise.all([
    db.select({ title: events.title }).from(events).where(eq(events.id, report.eventId)).get(),
    db.select({ lastName: users.lastName, firstName: users.firstName }).from(users).where(eq(users.id, report.authorId)).get(),
  ])
  return {
    id: report.id,
    authorId: report.authorId,
    eventTitle: event?.title ?? '',
    authorName: author ? `${author.lastName} ${author.firstName}` : '',
    division: report.division,
    approverId: report.approverId,
  }
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
        approvalSteps: activityReports.approvalSteps,
        currentStep: activityReports.currentStep,
        updatedAt: activityReports.updatedAt,
        ...eventColumns,
      })
      .from(activityReports)
      .innerJoin(events, eq(events.id, activityReports.eventId))
      .where(eq(activityReports.authorId, c.get('session').userId))
      .orderBy(desc(activityReports.updatedAt))
    return c.json({ reports })
  })

  // 承認待ちのうち、いまの段階を自分が担当しているもの
  .get('/review', async (c) => {
    const session = c.get('session')
    if (!session.officer && session.headOf.length === 0) return c.json({ reports: [] })

    const submitted = await createDb(c.env).query.activityReports.findMany({
      columns: { id: true, authorId: true, status: true, division: true, approverId: true, submittedAt: true, approvalSteps: true, currentStep: true },
      with: {
        author: { columns: memberSummaryColumns },
        event: { columns: { id: true, title: true, startsAt: true, endsAt: true } },
      },
      where: eq(activityReports.status, 'submitted'),
      orderBy: asc(activityReports.submittedAt),
    })
    const reports = submitted.filter((r) => canReviewStep(session, r, r.approvalSteps[r.currentStep]))
    return c.json({ reports })
  })

  // 役職者が選べる承認者（自分以外の部署長・本部長・代表）
  .get('/approvers', async (c) => {
    return c.json({ approvers: await approverCandidatesFor(createDb(c.env), c.get('session').userId) })
  })

  // 提出状況: 始まったイベントごとに、対象の参加者全員の状況（中身は見せない。下書きは未提出扱い）
  .get('/status', async (c) => {
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const recent = await db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt, endsAt: events.endsAt })
      .from(events)
      .where(lte(events.startsAt, nowInJst()))
      .orderBy(desc(events.startsAt))
      .limit(20)
    if (recent.length === 0) return c.json({ events: [] })
    const eventIds = recent.map((e) => e.id)

    const [participants, reports] = await Promise.all([
      db.query.eventParticipants.findMany({
        columns: { eventId: true, userId: true, role: true },
        with: { user: { columns: memberSummaryColumns } },
        where: and(inArray(eventParticipants.eventId, eventIds), isTargetParticipant),
        orderBy: asc(eventParticipants.createdAt),
      }),
      db
        .select({ id: activityReports.id, eventId: activityReports.eventId, authorId: activityReports.authorId, status: activityReports.status })
        .from(activityReports)
        .where(inArray(activityReports.eventId, eventIds)),
    ])

    return c.json({
      events: recent.map((event) => ({
        ...event,
        members: participants
          .filter((p) => p.eventId === event.id)
          .map((p) => {
            const report = reports.find((r) => r.eventId === event.id && r.authorId === p.userId)
            const status = report && report.status !== 'draft' ? report.status : null
            return {
              user: p.user,
              role: p.role,
              status,
              // 開けるのは承認済みと自分の報告書だけ
              reportId: report && (report.status === 'approved' || report.authorId === userId) ? report.id : null,
            }
          }),
      })),
    })
  })

  // 作成ページの初期表示（イベント・役割・本人の情報）。すでに書いていればその報告書のIDを返す
  .get('/new', validate('query', z.object({ eventId: z.string().min(1) })), async (c) => {
    const { eventId } = c.req.valid('query')
    const { userId } = c.get('session')
    const db = createDb(c.env)

    const existing = await findOwnReport(db, eventId, userId)
    if (existing) return c.json({ existingId: existing.id, draft: null })

    await assertCanWrite(db, eventId, userId)
    const [event, participant, author, divisions] = await Promise.all([
      db.select({ id: events.id, title: events.title, startsAt: events.startsAt, endsAt: events.endsAt, location: events.location }).from(events).where(eq(events.id, eventId)).get(),
      db.select({ role: eventParticipants.role }).from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId))).get(),
      db.query.users.findFirst({ columns: { ...memberSummaryColumns, studentId: true }, where: eq(users.id, userId) }),
      db.select({ division: userDivisions.division }).from(userDivisions).where(eq(userDivisions.userId, userId)),
    ])
    if (!event || !author) throw notFound('イベントが見つかりません')
    return c.json({
      existingId: null,
      draft: {
        event,
        author,
        authorRole: participant?.role ?? null,
        // 所属部署が1つなら最初から選んでおく
        division: divisions.length === 1 ? divisions[0].division : null,
      },
    })
  })

  // 作成ページで初めて保存・提出したときに作る
  .post('/', validate('json', reportCreateSchema), async (c) => {
    const { eventId, ...content } = c.req.valid('json')
    const { userId } = c.get('session')
    const db = createDb(c.env)

    const existing = await findOwnReport(db, eventId, userId)
    if (existing) throw conflict('このイベントの報告書はすでにあります。ページを再読み込みしてください。')
    await assertCanWrite(db, eventId, userId)
    await assertOwnDivision(db, userId, content.division)
    await assertApprover(db, userId, content.approverId)

    const id = crypto.randomUUID()
    await db.insert(activityReports).values({ id, eventId, authorId: userId, ...content })
    return c.json({ id }, 201)
  })

  .get('/:id', async (c) => {
    const session = c.get('session')
    const db = createDb(c.env)
    const row = await db.query.activityReports.findFirst({
      where: eq(activityReports.id, c.req.param('id')),
      with: {
        author: { columns: { ...memberSummaryColumns, studentId: true } },
        approver: { columns: memberSummaryColumns },
        event: { columns: { id: true, title: true, startsAt: true, endsAt: true, location: true } },
        reviews: {
          with: {
            reviewer: { columns: memberSummaryColumns },
            comments: { orderBy: [asc(activityReportComments.field), asc(activityReportComments.start)] },
          },
          orderBy: asc(activityReportReviews.createdAt),
        },
      },
    })
    if (!row || !canView(session, row)) throw notFound('報告書が見つかりません')

    const participant = await db
      .select({ role: eventParticipants.role })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, row.eventId), eq(eventParticipants.userId, row.authorId)))
      .get()

    // 学籍番号は本人と承認の流れにいる人にだけ見せる
    const isAuthor = row.authorId === session.userId
    const { studentId, ...author } = row.author
    return c.json({
      report: { ...row, author: { ...author, studentId: isAuthor || isApprover(session, row) ? studentId : null } },
      authorRole: participant?.role ?? null,
      canEdit: isAuthor && EDITABLE.includes(row.status),
      canDelete: isAuthor && row.status === 'draft',
      canWithdraw: isAuthor && row.status === 'submitted',
      canReview: row.status === 'submitted' && canReviewStep(session, row, row.approvalSteps[row.currentStep]),
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
    await assertApprover(db, session.userId, input.approverId)
    await updateIfUnchanged(db, report, EDITABLE, input)
    return c.json({ ok: true })
  })

  .post('/:id/submit', validate('json', reportSubmitSchema), async (c) => {
    const session = c.get('session')
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'))
    assertEditable(session, report)
    await assertOwnDivision(db, session.userId, input.division)

    // 部員は所属部署の部署長、役職者（部署長・本部長・代表）は自分で選んだ承認者が承認する
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
    return c.json({ ok: true })
  })

  // 提出の取り消し（承認待ちの間だけ）。下書きに戻して編集できるようにし、進んだ段階は保つ
  .post('/:id/withdraw', async (c) => {
    const session = c.get('session')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'))
    if (report.authorId !== session.userId) throw forbidden()
    if (report.status !== 'submitted') throw conflict('承認待ちの報告書ではありません。ページを再読み込みしてください。')
    await updateIfUnchanged(db, report, ['submitted'], { status: 'draft' })
    return c.json({ ok: true })
  })

  .post('/:id/review', validate('json', reportReviewSchema), async (c) => {
    const session = c.get('session')
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'))
    if (report.status !== 'submitted') throw conflict('承認待ちの報告書ではありません')
    const step = report.approvalSteps[report.currentStep]
    if (!canReviewStep(session, report, step)) throw forbidden()

    // 範囲コメントは、確認している本文のその位置を指していること
    const comments = input.decision === 'reject' ? input.comments : []
    for (const comment of comments) {
      if (report[comment.field].slice(comment.start, comment.end) !== comment.quote) {
        throw badRequest('コメントした範囲の本文が変わっています。ページを再読み込みしてください。')
      }
    }

    const nextStep = report.currentStep + 1
    const finished = input.decision === 'approve' && nextStep >= report.approvalSteps.length
    await updateIfUnchanged(
      db,
      report,
      ['submitted'],
      input.decision === 'reject'
        ? { status: 'rejected' }
        : finished
          ? { status: 'approved', approvedAt: new Date().toISOString() }
          : { currentStep: nextStep },
    )

    const reviewId = crypto.randomUUID()
    await db.batch([
      db.insert(activityReportReviews).values({
        id: reviewId,
        reportId: report.id,
        reviewerId: session.userId,
        step,
        decision: input.decision,
        comment: input.comment,
      }),
      ...comments.map((comment) => db.insert(activityReportComments).values({ id: crypto.randomUUID(), reviewId, ...comment })),
    ])

    const summary = await summaryOf(db, report)
    if (input.decision === 'reject') {
      const reviewer = await db
        .select({ lastName: users.lastName, firstName: users.firstName })
        .from(users)
        .where(eq(users.id, session.userId))
        .get()
      runInBackground(
        c,
        notifyRejected(c.env, summary, {
          reviewerName: reviewer ? `${reviewer.lastName} ${reviewer.firstName}` : '',
          step,
          comment: input.comment,
          inlineCount: comments.length,
        }),
      )
    } else if (finished) {
      runInBackground(c, notifyApproved(c.env, summary))
    } else {
      runInBackground(c, notifyAwaitingReview(c.env, db, summary, report.approvalSteps[nextStep], 'advanced'))
    }
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
