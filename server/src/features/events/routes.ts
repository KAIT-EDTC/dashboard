import { and, asc, count, desc, eq, getTableColumns, gte, lte, ne, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  eventInputSchema,
  itemInputSchema,
  itemUpdateSchema,
  nowInJst,
  participantUpdateSchema,
  rsvpSchema,
  type RsvpStatus,
} from '@edtc/shared'
import { createDb, memberSummaryColumns, type Db } from '../../db'
import { eventItems, eventParticipants, events, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import { runInBackground } from '../../lib/background'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { assertCanManage, canManage, requireAuth } from '../../middleware/auth'
import { approvedReportsOf, myReportOf } from '../reports/queries'
import { notifyEventCreated } from './notifications'

/** 終了日時が無いイベントは開始日の終わりまでを開催中とみなす */
const effectiveEnd = sql`coalesce(${events.endsAt}, substr(${events.startsAt}, 1, 10) || 'T23:59')`

const listQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past']).optional(),
  /** カレンダー表示用: 開始日で絞り込む (YYYY-MM-DD) */
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
})

async function findEvent(db: Db, id: string) {
  const event = await db.select().from(events).where(eq(events.id, id)).get()
  if (!event) throw notFound('イベントが見つかりません')
  return event
}

export const eventsRoute = new Hono<AppEnv>()
  .use(requireAuth)

  .get('/', validate('query', listQuerySchema), async (c) => {
    const { scope, from, to } = c.req.valid('query')
    const { userId } = c.get('session')
    const now = nowInJst()

    const where: SQL[] = []
    if (scope === 'upcoming') where.push(sql`${effectiveEnd} >= ${now}`)
    if (scope === 'past') where.push(sql`${effectiveEnd} < ${now}`)
    if (from) where.push(gte(events.startsAt, from))
    if (to) where.push(lte(events.startsAt, `${to}T23:59`))

    const p = eventParticipants
    const rows = await createDb(c.env)
      .select({
        ...getTableColumns(events),
        goingCount: sql<number>`count(case when ${p.status} = 'going' then 1 end)`.mapWith(Number),
        maybeCount: sql<number>`count(case when ${p.status} = 'maybe' then 1 end)`.mapWith(Number),
        myStatus: sql<RsvpStatus | null>`max(case when ${p.userId} = ${userId} then ${p.status} end)`,
      })
      .from(events)
      .leftJoin(p, eq(p.eventId, events.id))
      .where(and(...where))
      .groupBy(events.id)
      .orderBy(scope === 'past' ? desc(events.startsAt) : asc(events.startsAt))
      .limit(scope === 'past' ? 50 : 200)

    return c.json({ events: rows })
  })

  // 自分が担当している、これからのイベントの持ち物
  .get('/my-items', async (c) => {
    const items = await createDb(c.env)
      .select({
        id: eventItems.id,
        name: eventItems.name,
        quantity: eventItems.quantity,
        prepared: eventItems.prepared,
        eventId: events.id,
        eventTitle: events.title,
        startsAt: events.startsAt,
      })
      .from(eventItems)
      .innerJoin(events, eq(events.id, eventItems.eventId))
      .where(and(eq(eventItems.assigneeId, c.get('session').userId), sql`${effectiveEnd} >= ${nowInJst()}`))
      .orderBy(asc(events.startsAt))
    return c.json({ items })
  })

  .post('/', validate('json', eventInputSchema), async (c) => {
    const input = c.req.valid('json')
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const id = crypto.randomUUID()

    // 作成者は主催者として参加扱いにする
    await db.batch([
      db.insert(events).values({ ...input, id, createdBy: userId }),
      db.insert(eventParticipants).values({ eventId: id, userId, status: 'going' }),
    ])

    const organizer = await db
      .select({ lastName: users.lastName, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    runInBackground(
      c,
      notifyEventCreated(c.env, { id, ...input }, organizer ? `${organizer.lastName} ${organizer.firstName}` : ''),
    )

    return c.json({ id }, 201)
  })

  .get('/:id', async (c) => {
    const session = c.get('session')
    const db = createDb(c.env)
    const event = await db.query.events.findFirst({
      where: eq(events.id, c.req.param('id')),
      with: {
        creator: { columns: memberSummaryColumns },
        participants: {
          with: { user: { columns: memberSummaryColumns } },
          orderBy: asc(eventParticipants.createdAt),
        },
        items: {
          with: { assignee: { columns: memberSummaryColumns } },
          orderBy: [asc(eventItems.kind), asc(eventItems.createdAt)],
        },
      },
    })
    if (!event) throw notFound('イベントが見つかりません')
    const [reports, myReport] = await Promise.all([
      approvedReportsOf(db, event.id),
      myReportOf(db, event.id, session.userId),
    ])
    return c.json({ event, reports, myReport: myReport ?? null, canManage: canManage(session, event.createdBy) })
  })

  .put('/:id', validate('json', eventInputSchema), async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    assertCanManage(c.get('session'), event.createdBy)
    await db.update(events).set(c.req.valid('json')).where(eq(events.id, event.id))
    return c.json({ id: event.id })
  })

  .delete('/:id', async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    assertCanManage(c.get('session'), event.createdBy)
    await db.delete(events).where(eq(events.id, event.id))
    return c.json({ ok: true })
  })

  // --- 出欠 -----------------------------------------------------------------

  .put('/:id/rsvp', validate('json', rsvpSchema), async (c) => {
    const { status, comment } = c.req.valid('json')
    const session = c.get('session')
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))

    if (event.rsvpDeadline && nowInJst() > event.rsvpDeadline && !canManage(session, event.createdBy)) {
      throw badRequest('出欠の回答期限を過ぎています。主催者に連絡してください。')
    }
    if (status === 'going' && event.capacity) {
      const others = await db
        .select({ n: count() })
        .from(eventParticipants)
        .where(
          and(
            eq(eventParticipants.eventId, event.id),
            eq(eventParticipants.status, 'going'),
            ne(eventParticipants.userId, session.userId),
          ),
        )
        .get()
      if ((others?.n ?? 0) >= event.capacity) throw conflict('定員に達しています')
    }

    const now = new Date().toISOString()
    await db
      .insert(eventParticipants)
      .values({ eventId: event.id, userId: session.userId, status, comment })
      .onConflictDoUpdate({
        target: [eventParticipants.eventId, eventParticipants.userId],
        set: { status, comment, updatedAt: now },
      })

    // 不参加にしたら担当していた持ち物と講師の役割を手放す
    if (status === 'declined') {
      await db.batch([
        db
          .update(eventItems)
          .set({ assigneeId: null, prepared: false })
          .where(and(eq(eventItems.eventId, event.id), eq(eventItems.assigneeId, session.userId))),
        db
          .update(eventParticipants)
          .set({ role: 'assistant' })
          .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, session.userId))),
      ])
    }
    return c.json({ ok: true })
  })

  // 出席・支払い・役割の記録（主催者・管理者）
  .patch('/:id/participants/:userId', validate('json', participantUpdateSchema), async (c) => {
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    assertCanManage(c.get('session'), event.createdBy)

    const target = and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, c.req.param('userId')))
    const participant = await db.select({ userId: eventParticipants.userId }).from(eventParticipants).where(target).get()
    if (!participant) throw notFound('参加者が見つかりません')

    const update = db.update(eventParticipants).set(input).where(target)
    if (input.role === 'lecturer') {
      // 講師は1人だけ。新しく講師にしたら、それまでの講師は講師補助に戻す
      await db.batch([
        db
          .update(eventParticipants)
          .set({ role: 'assistant' })
          .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.role, 'lecturer'))),
        update,
      ])
    } else {
      await update
    }
    return c.json({ ok: true })
  })

  // --- 持ち物 ---------------------------------------------------------------

  .post('/:id/items', validate('json', itemInputSchema), async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    assertCanManage(c.get('session'), event.createdBy)
    const id = crypto.randomUUID()
    await db.insert(eventItems).values({ ...c.req.valid('json'), id, eventId: event.id })
    return c.json({ id }, 201)
  })

  /**
   * 主催者・管理者は全項目を編集できる。
   * それ以外のメンバーは共有の持ち物を「自分が担当する／やめる」と、自分の担当分の準備完了だけ変更できる
   */
  .patch('/:id/items/:itemId', validate('json', itemUpdateSchema), async (c) => {
    const input = c.req.valid('json')
    const session = c.get('session')
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    const item = await db
      .select()
      .from(eventItems)
      .where(and(eq(eventItems.id, c.req.param('itemId')), eq(eventItems.eventId, event.id)))
      .get()
    if (!item) throw notFound('持ち物が見つかりません')

    const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== item.assigneeId
    if (!canManage(session, event.createdBy)) {
      const onlyAssignment = Object.keys(input).every((key) => key === 'assigneeId' || key === 'prepared')
      const nextAssignee = input.assigneeId === undefined ? item.assigneeId : input.assigneeId
      const validAssignment =
        !assigneeChanged ||
        (input.assigneeId === session.userId && item.assigneeId === null) ||
        (input.assigneeId === null && item.assigneeId === session.userId)
      const validPrepared = input.prepared === undefined || nextAssignee === session.userId
      if (!onlyAssignment || !validAssignment || !validPrepared) {
        throw item.assigneeId && item.assigneeId !== session.userId ? conflict('すでに他の人が担当しています') : forbidden()
      }
    } else if (input.assigneeId) {
      const assignee = await db.select({ id: users.id }).from(users).where(eq(users.id, input.assigneeId)).get()
      if (!assignee) throw badRequest('担当者が見つかりません')
    }

    await db
      .update(eventItems)
      .set({ ...input, ...(assigneeChanged && input.prepared === undefined && { prepared: false }) })
      .where(eq(eventItems.id, item.id))
    return c.json({ ok: true })
  })

  .delete('/:id/items/:itemId', async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    assertCanManage(c.get('session'), event.createdBy)
    await db
      .delete(eventItems)
      .where(and(eq(eventItems.id, c.req.param('itemId')), eq(eventItems.eventId, event.id)))
    return c.json({ ok: true })
  })
