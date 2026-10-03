import { and, asc, desc, eq, inArray, isNull, lte, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  COMMENTABLE_FIELDS_OF,
  EDITABLE_REPORT_STATUSES,
  isEditableStatus,
  isLeader,
  nowInJst,
  reportCreateSchema,
  reportDraftSchema,
  reportReviewSchema,
  reportSubmitSchema,
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
import type { AppEnv } from '../../env'
import { runInBackground } from '../../lib/background'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { requireAuth } from '../../middleware/auth'
import { canReviewNow, canView, isApprover } from './access'
import { assertApprover, assertEditable, assertOwnDivision, findReport, nameOf, submitReport, summaryOf, updateIfUnchanged } from './common'
import { notifyApproved, notifyAwaitingReview, notifyRejected } from './notifications'
import { approverCandidatesFor, isTargetParticipant, myReportOf, submissionProgress, summaryMembersOf } from './queries'
import { summariesRoute, visibleMembers } from './summaries'

/** 報告書の一覧に出すイベントの情報 */
const eventColumns = {
  eventId: events.id,
  eventTitle: events.title,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
}

/** 報告書を書けるのは、参加したイベントが始まってから。書く人のそのイベントでの役割を返す */
async function assertCanWrite(db: Db, eventId: string, userId: string) {
  const participation = await db
    .select({ startsAt: events.startsAt, role: eventParticipants.role })
    .from(eventParticipants)
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId), isTargetParticipant))
    .get()
  if (!participation) throw forbidden('このイベントに参加した人だけが報告書を書けます')
  if (participation.startsAt > nowInJst()) throw badRequest('報告書はイベントが始まってから書けます')
  return participation.role
}

const isActivity = eq(activityReports.kind, 'activity')

/** 自分が担当するまとめ報告書（始まったイベントで、指名された・講師として担当する・すでに書いている） */
async function summaryTargetsOf(db: Db, userId: string) {
  const lecturing = db
    .select({ eventId: eventParticipants.eventId })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.userId, userId), eq(eventParticipants.role, 'lecturer'), isTargetParticipant))
  const rows = await db
    .select({
      ...eventColumns,
      reportId: activityReports.id,
      reportStatus: activityReports.status,
      reportAuthorId: activityReports.authorId,
    })
    .from(events)
    .leftJoin(activityReports, and(eq(activityReports.eventId, events.id), eq(activityReports.kind, 'summary')))
    .where(
      and(
        lte(events.startsAt, nowInJst()),
        or(
          eq(events.summaryWriterId, userId),
          and(isNull(events.summaryWriterId), inArray(events.id, lecturing)),
          eq(activityReports.authorId, userId),
        ),
      ),
    )
    .orderBy(desc(events.startsAt))
    .limit(50)
  // 担当が別の人に移った（その人がすでに書き始めた）ものは除く
  const mine = rows.filter((row) => !row.reportAuthorId || row.reportAuthorId === userId)
  return Promise.all(
    mine.map(async ({ reportAuthorId: _, ...row }) => ({ ...row, ...submissionProgress(await summaryMembersOf(db, row.eventId), userId) })),
  )
}

export const reportsRoute = new Hono<AppEnv>()
  .use(requireAuth)

  // まとめ報告書の作成・保存・提出・書き出し（確認・取り消し・削除は活動報告書と共通の /:id を使う）
  .route('/summaries', summariesRoute)

  // 報告書を書ける（開始済みで自分が参加した）イベントと、自分の報告書の状態
  .get('/targets', async (c) => {
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const targets = await db
      .select({
        ...eventColumns,
        location: events.location,
        role: eventParticipants.role,
        reportId: activityReports.id,
        reportStatus: activityReports.status,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .leftJoin(activityReports, and(eq(activityReports.eventId, events.id), eq(activityReports.authorId, userId), isActivity))
      .where(and(eq(eventParticipants.userId, userId), isTargetParticipant, lte(events.startsAt, nowInJst())))
      .orderBy(desc(events.startsAt))
      .limit(50)
    const summaries = await summaryTargetsOf(db, userId)
    // まとめ報告書の担当者は、そのイベントの活動報告書を書かなくてよい（書き始めていれば出す）
    const writing = new Set(summaries.map((s) => s.eventId))
    return c.json({ targets: targets.filter((t) => t.reportId || !writing.has(t.eventId)), summaries })
  })

  .get('/mine', async (c) => {
    const reports = await createDb(c.env)
      .select({
        id: activityReports.id,
        kind: activityReports.kind,
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
    if (!isLeader(session)) return c.json({ reports: [] })

    const submitted = await createDb(c.env).query.activityReports.findMany({
      columns: { id: true, kind: true, authorId: true, status: true, division: true, approverId: true, submittedAt: true, approvalSteps: true, currentStep: true },
      with: {
        author: { columns: memberSummaryColumns },
        event: { columns: { id: true, title: true, startsAt: true, endsAt: true } },
      },
      where: eq(activityReports.status, 'submitted'),
      orderBy: asc(activityReports.submittedAt),
    })
    const reports = submitted.filter((r) => canReviewNow(session, r))
    return c.json({ reports })
  })

  // 役職者が選べる承認者（自分以外の部署長・本部長・代表）
  .get('/approvers', async (c) => {
    return c.json({ approvers: await approverCandidatesFor(createDb(c.env), c.get('session').userId) })
  })

  // 提出状況: 始まったイベントごとに、対象の参加者全員の状況とまとめ報告書の状況（中身は見せない。下書きは未提出扱い）
  .get('/status', async (c) => {
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const recent = await db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt, endsAt: events.endsAt, summaryWriterId: events.summaryWriterId })
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
        .select({
          id: activityReports.id,
          kind: activityReports.kind,
          eventId: activityReports.eventId,
          authorId: activityReports.authorId,
          status: activityReports.status,
        })
        .from(activityReports)
        .where(inArray(activityReports.eventId, eventIds)),
    ])
    // 開けるのは承認済みと自分の報告書だけ
    const visibleId = (report: (typeof reports)[number]) => (report.status === 'approved' || report.authorId === userId ? report.id : null)
    const shownStatus = (report: (typeof reports)[number] | undefined) => (report && report.status !== 'draft' ? report.status : null)

    return c.json({
      events: recent.map(({ summaryWriterId, ...event }) => {
        const members = participants.filter((p) => p.eventId === event.id)
        const summary = reports.find((r) => r.eventId === event.id && r.kind === 'summary')
        // 担当者: 書き始めた人、指名された人、講師の順
        const writerId = summary?.authorId ?? summaryWriterId ?? members.find((m) => m.role === 'lecturer')?.userId
        return {
          ...event,
          members: members.map((p) => {
            const report = reports.find((r) => r.eventId === event.id && r.kind === 'activity' && r.authorId === p.userId)
            return {
              user: p.user,
              role: p.role,
              status: shownStatus(report),
              reportId: report ? visibleId(report) : null,
              /** まとめ報告書の担当者（活動報告書は書かなくてよい） */
              isSummaryWriter: p.userId === writerId,
            }
          }),
          summary: {
            writer: members.find((m) => m.userId === writerId)?.user ?? null,
            status: shownStatus(summary),
            reportId: summary ? visibleId(summary) : null,
          },
        }
      }),
    })
  })

  // Excel（活動報告書の様式）に書き出す承認済みの報告書。eventId・reportId で絞れる。学籍番号は管理者・役職者と本人にだけ渡す
  .get(
    '/export',
    validate('query', z.object({ eventId: z.string().min(1).optional(), reportId: z.string().min(1).optional() })),
    async (c) => {
      const { eventId, reportId } = c.req.valid('query')
      const session = c.get('session')
      const db = createDb(c.env)
      const rows = await db.query.activityReports.findMany({
        columns: { id: true, eventId: true, authorId: true, division: true, content: true, reflection: true, rating: true, notes: true, submittedAt: true },
        with: {
          author: { columns: { lastName: true, firstName: true, lastNameKana: true, firstNameKana: true, studentId: true } },
          event: { columns: { title: true, startsAt: true, endsAt: true, location: true } },
        },
        where: and(
          isActivity,
          eq(activityReports.status, 'approved'),
          eventId ? eq(activityReports.eventId, eventId) : undefined,
          reportId ? eq(activityReports.id, reportId) : undefined,
        ),
      })
      const roles = rows.length
        ? await db
            .select({ eventId: eventParticipants.eventId, userId: eventParticipants.userId, role: eventParticipants.role })
            .from(eventParticipants)
            .where(inArray(eventParticipants.eventId, [...new Set(rows.map((r) => r.eventId))]))
        : []
      const privileged = session.role === 'admin' || isLeader(session)

      const reports = rows
        .map(({ author: { studentId, ...author }, ...report }) => ({
          ...report,
          author: { ...author, studentId: privileged || report.authorId === session.userId ? studentId : null },
          role: roles.find((r) => r.eventId === report.eventId && r.userId === report.authorId)?.role ?? null,
        }))
        .sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt) || a.author.lastNameKana.localeCompare(b.author.lastNameKana, 'ja'))
      return c.json({ reports })
    },
  )

  // 作成ページの初期表示（イベント・役割・本人の情報）。すでに書いていればその報告書のIDを返す
  .get('/new', validate('query', z.object({ eventId: z.string().min(1) })), async (c) => {
    const { eventId } = c.req.valid('query')
    const { userId } = c.get('session')
    const db = createDb(c.env)

    const existing = await myReportOf(db, eventId, userId)
    if (existing) return c.json({ existingId: existing.id, draft: null })

    const authorRole = await assertCanWrite(db, eventId, userId)
    const [event, author, divisions] = await Promise.all([
      db.select({ id: events.id, title: events.title, startsAt: events.startsAt, endsAt: events.endsAt, location: events.location }).from(events).where(eq(events.id, eventId)).get(),
      db.query.users.findFirst({ columns: { ...memberSummaryColumns, studentId: true }, where: eq(users.id, userId) }),
      db.select({ division: userDivisions.division }).from(userDivisions).where(eq(userDivisions.userId, userId)),
    ])
    if (!event || !author) throw notFound('イベントが見つかりません')
    return c.json({
      existingId: null,
      draft: {
        event,
        author,
        authorRole,
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

    const existing = await myReportOf(db, eventId, userId)
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
    // まとめ報告書: 参加者と、それぞれの活動報告書の提出状況・評価
    const members = row.kind === 'summary' ? visibleMembers(session, row, await summaryMembersOf(db, row.eventId)) : []
    return c.json({
      report: { ...row, author: { ...author, studentId: isAuthor || isApprover(session, row) ? studentId : null } },
      authorRole: participant?.role ?? null,
      members,
      canEdit: isAuthor && isEditableStatus(row.status),
      canDelete: isAuthor && row.status === 'draft',
      canWithdraw: isAuthor && row.status === 'submitted',
      canReview: canReviewNow(session, row),
    })
  })

  // 下書き保存（差し戻し中の修正もここ）
  .put('/:id', validate('json', reportDraftSchema), async (c) => {
    const session = c.get('session')
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'), 'activity')
    assertEditable(session, report)
    await assertOwnDivision(db, session.userId, input.division)
    await assertApprover(db, session.userId, input.approverId)
    await updateIfUnchanged(db, report, EDITABLE_REPORT_STATUSES, input)
    return c.json({ ok: true })
  })

  .post('/:id/submit', validate('json', reportSubmitSchema), async (c) => {
    const session = c.get('session')
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'), 'activity')
    assertEditable(session, report)
    await assertOwnDivision(db, session.userId, input.division)
    await submitReport(c, db, report, input)
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
    if (!canReviewNow(session, report)) throw forbidden()
    const step = report.approvalSteps[report.currentStep]

    // 範囲コメントは、確認している本文のその位置を指していること
    const comments = input.decision === 'reject' ? input.comments : []
    for (const comment of comments) {
      if (!COMMENTABLE_FIELDS_OF[report.kind].includes(comment.field)) throw badRequest('コメントできない項目です')
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
      runInBackground(
        c,
        notifyRejected(c.env, db, summary, {
          reviewerName: await nameOf(db, session.userId),
          step,
          comment: input.comment,
          inlineCount: comments.length,
        }),
      )
    } else if (finished) {
      runInBackground(c, notifyApproved(c.env, db, summary))
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
