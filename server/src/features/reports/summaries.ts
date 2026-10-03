import { and, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { EDITABLE_REPORT_STATUSES, isLeader, nowInJst, summaryCreateSchema, summaryDraftSchema, summarySubmitSchema, type SummaryDraftInput } from '@edtc/shared'
import { createDb, memberSummaryColumns, type Db } from '../../db'
import { activityReports, events, userDivisions, users } from '../../db/schema'
import type { AppEnv, Session } from '../../env'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { isApprover } from './access'
import { assertApprover, assertEditable, assertOwnDivision, findReport, submitReport, updateIfUnchanged, type ReportRow } from './common'
import { findEventForSummary, submissionProgress, summaryMembersOf, summaryReportOf, summaryWriterIdOf, type SummaryMember } from './queries'

/**
 * まとめ報告書を見る人に合わせて参加者の情報を絞る。
 * 学籍番号は担当者・管理者・役職者、事後報告（自己分析を書くときの元）は担当者と承認の流れにいる人だけ。
 * 活動報告書へのリンクは、承認済みか自分のものだけ
 */
export function visibleMembers(
  session: Session,
  summary: Pick<ReportRow, 'authorId' | 'status' | 'division' | 'approverId' | 'approvalSteps' | 'currentStep'>,
  members: SummaryMember[],
) {
  const isAuthor = summary.authorId === session.userId
  const privileged = isAuthor || session.role === 'admin' || isLeader(session)
  const canReadReflection = isAuthor || (summary.status !== 'draft' && isApprover(session, summary))
  return members.map(({ user: { studentId, ...user }, role, report }) => ({
    user: { ...user, studentId: privileged ? studentId : null },
    role,
    /** まとめ報告書の担当者（活動報告書は書かなくてよい） */
    isWriter: user.id === summary.authorId,
    report: report && {
      id: report.status === 'approved' || report.authorId === session.userId ? report.id : null,
      status: report.status,
      rating: report.rating,
      reflection: canReadReflection ? report.reflection : null,
    },
  }))
}

/** 書けるのは担当者だけで、イベントが始まってから */
async function assertSummaryWriter(db: Db, eventId: string, userId: string) {
  const event = await findEventForSummary(db, eventId)
  if (!event) throw notFound('イベントが見つかりません')
  if ((await summaryWriterIdOf(db, event)) !== userId) throw forbidden('まとめ報告書は担当者だけが書けます')
  if (event.startsAt > nowInJst()) throw badRequest('まとめ報告書はイベントが始まってから書けます')
  return event
}

/** 自己分析は参加者の分だけ残し、参加者の並びにそろえる */
function analysesFor(members: SummaryMember[], analyses: SummaryDraftInput['analyses']) {
  return members.map((m) => ({ userId: m.user.id, text: analyses.find((a) => a.userId === m.user.id)?.text.trim() ?? '' }))
}

export const summariesRoute = new Hono<AppEnv>()
  // 作成ページの初期表示。すでにあればそのIDを返す。自己分析は各自の事後報告を最初から入れておく
  .get('/new', validate('query', z.object({ eventId: z.string().min(1) })), async (c) => {
    const { eventId } = c.req.valid('query')
    const session = c.get('session')
    const db = createDb(c.env)

    const existing = await summaryReportOf(db, eventId)
    if (existing) return c.json({ existingId: existing.id, draft: null })

    await assertSummaryWriter(db, eventId, session.userId)
    const [event, author, divisions, members] = await Promise.all([
      db.select({ id: events.id, title: events.title, startsAt: events.startsAt, endsAt: events.endsAt, location: events.location }).from(events).where(eq(events.id, eventId)).get(),
      db.query.users.findFirst({ columns: { ...memberSummaryColumns, studentId: true }, where: eq(users.id, session.userId) }),
      db.select({ division: userDivisions.division }).from(userDivisions).where(eq(userDivisions.userId, session.userId)),
      summaryMembersOf(db, eventId),
    ])
    if (!event || !author) throw notFound('イベントが見つかりません')
    const notCreated = { authorId: session.userId, status: 'draft', division: null, approverId: null, currentStep: 0 } as const
    return c.json({
      existingId: null,
      draft: {
        event,
        author,
        division: divisions.length === 1 ? divisions[0].division : null,
        members: visibleMembers(session, { ...notCreated, approvalSteps: [] }, members),
        analyses: members.map((m) => ({ userId: m.user.id, text: m.report?.reflection ?? '' })),
      },
    })
  })

  // 作成ページで初めて保存・提出したときに作る。担当者もこの人に決める（あとで講師が替わっても担当は動かない）
  .post('/', validate('json', summaryCreateSchema), async (c) => {
    const { eventId, analyses, ...content } = c.req.valid('json')
    const { userId } = c.get('session')
    const db = createDb(c.env)

    if (await summaryReportOf(db, eventId)) throw conflict('このイベントのまとめ報告書はすでにあります。ページを再読み込みしてください。')
    await assertSummaryWriter(db, eventId, userId)
    await assertOwnDivision(db, userId, content.division)
    await assertApprover(db, userId, content.approverId)

    const id = crypto.randomUUID()
    const members = await summaryMembersOf(db, eventId)
    await db.batch([
      db.insert(activityReports).values({ id, eventId, authorId: userId, kind: 'summary', analyses: analysesFor(members, analyses), ...content }),
      db
        .update(events)
        .set({ summaryWriterId: userId })
        .where(and(eq(events.id, eventId), isNull(events.summaryWriterId))),
    ])
    return c.json({ id }, 201)
  })

  // 書き出し用の承認済みのまとめ報告書。eventId・reportId で絞れる。学籍番号は管理者・役職者と担当者にだけ渡す
  .get(
    '/export',
    validate('query', z.object({ eventId: z.string().min(1).optional(), reportId: z.string().min(1).optional() })),
    async (c) => {
      const { eventId, reportId } = c.req.valid('query')
      const session = c.get('session')
      const db = createDb(c.env)
      const rows = await db.query.activityReports.findMany({
        columns: {
          id: true,
          eventId: true,
          authorId: true,
          division: true,
          content: true,
          hosting: true,
          analyses: true,
          overview: true,
          impressions: true,
          rating: true,
          notes: true,
          submittedAt: true,
        },
        with: {
          author: { columns: { lastName: true, firstName: true, lastNameKana: true, firstNameKana: true, studentId: true } },
          event: { columns: { title: true, startsAt: true, endsAt: true, location: true } },
        },
        where: and(
          eq(activityReports.kind, 'summary'),
          eq(activityReports.status, 'approved'),
          eventId ? eq(activityReports.eventId, eventId) : undefined,
          reportId ? eq(activityReports.id, reportId) : undefined,
        ),
      })
      const privileged = session.role === 'admin' || isLeader(session)

      const summaries = await Promise.all(
        rows.map(async ({ author: { studentId, ...author }, analyses, ...summary }) => {
          const canSeeIds = privileged || summary.authorId === session.userId
          const members = await summaryMembersOf(db, summary.eventId)
          return {
            ...summary,
            author: { ...author, studentId: canSeeIds ? studentId : null },
            // 様式の参加者欄・自己分析欄の並び（講師が先頭）。評価は各自の活動報告書から
            members: members.map((m) => ({
              lastName: m.user.lastName,
              firstName: m.user.firstName,
              studentId: canSeeIds ? m.user.studentId : null,
              // 担当者が活動報告書を書いていなければ、まとめ報告書の総合評価を使う
              rating: m.report?.rating ?? (m.user.id === summary.authorId ? summary.rating : null),
              analysis: analyses.find((a) => a.userId === m.user.id)?.text ?? '',
            })),
          }
        }),
      )
      summaries.sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt))
      return c.json({ summaries })
    },
  )

  // 下書き保存（差し戻し中の修正もここ）
  .put('/:id', validate('json', summaryDraftSchema), async (c) => {
    const session = c.get('session')
    const { analyses, ...input } = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'), 'summary')
    assertEditable(session, report)
    await assertOwnDivision(db, session.userId, input.division)
    await assertApprover(db, session.userId, input.approverId)
    const members = await summaryMembersOf(db, report.eventId)
    await updateIfUnchanged(db, report, EDITABLE_REPORT_STATUSES, { ...input, analyses: analysesFor(members, analyses) })
    return c.json({ ok: true })
  })

  // 提出できるのは、参加者全員（担当者を除く）の活動報告書が提出され（承認待ち・承認済み）、全員の自己分析を書いたとき
  .post('/:id/submit', validate('json', summarySubmitSchema), async (c) => {
    const session = c.get('session')
    const { analyses, ...input } = c.req.valid('json')
    const db = createDb(c.env)
    const report = await findReport(db, c.req.param('id'), 'summary')
    assertEditable(session, report)
    await assertOwnDivision(db, session.userId, input.division)

    const members = await summaryMembersOf(db, report.eventId)
    const { submitted, total } = submissionProgress(members, report.authorId)
    if (submitted < total) throw badRequest(`参加者全員の活動報告書が提出されてから提出できます（提出済み ${submitted} / ${total}人）`)
    const sorted = analysesFor(members, analyses)
    if (sorted.some((a) => a.text.length === 0)) throw badRequest('参加者全員の自己分析を入力してください')

    await submitReport(c, db, report, { ...input, analyses: sorted })
    return c.json({ ok: true })
  })
