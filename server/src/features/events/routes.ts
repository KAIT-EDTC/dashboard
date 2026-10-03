import { and, asc, count, desc, eq, getTableColumns, gte, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  DIVISIONS,
  eventInputSchema,
  itemInputSchema,
  itemUpdateSchema,
  nowInJst,
  participantUpdateSchema,
  rsvpSchema,
  type CategoryTone,
  type Division,
  type RsvpStatus,
} from '@edtc/shared'
import { createDb, memberSummaryColumns, type Db } from '../../db'
import { eventCategories, eventItems, eventParticipants, events, eventTargetDivisions, eventTargetUsers, userDivisions, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import { runInBackground } from '../../lib/background'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { assertCanManage, canManage, requireAuth } from '../../middleware/auth'
import { eventCategoriesRoute } from './categories'
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

// --- 対象者 -----------------------------------------------------------------

const td = eventTargetDivisions
const tu = eventTargetUsers

/** 部署は表示順（DIVISIONS の順）にそろえる */
const sortDivisions = (divisions: string[]) => DIVISIONS.filter((division) => divisions.includes(division))

/** 一覧で、そのユーザーがイベントの対象か（対象の指定が無ければ全員が対象） */
const isTargetOf = (userId: string) =>
  sql<boolean>`(
    (not exists (select 1 from ${td} where ${td.eventId} = ${events.id}) and not exists (select 1 from ${tu} where ${tu.eventId} = ${events.id}))
    or exists (select 1 from ${tu} where ${tu.eventId} = ${events.id} and ${tu.userId} = ${userId})
    or exists (select 1 from ${td} inner join ${userDivisions} on ${userDivisions.division} = ${td.division} where ${td.eventId} = ${events.id} and ${userDivisions.userId} = ${userId})
  )`.mapWith(Boolean)

/** 対象の個人と、対象の部署に今所属している人。対象の指定が無ければ空 */
function findTargetMembers(db: Db, eventId: string) {
  return db
    .select({
      id: users.id,
      discordUsername: users.discordUsername,
      discordAvatar: users.discordAvatar,
      lastName: users.lastName,
      firstName: users.firstName,
      nickname: users.nickname,
    })
    .from(users)
    .where(
      or(
        inArray(users.id, db.select({ id: tu.userId }).from(tu).where(eq(tu.eventId, eventId))),
        inArray(
          users.id,
          db
            .select({ id: userDivisions.userId })
            .from(userDivisions)
            .where(inArray(userDivisions.division, db.select({ division: td.division }).from(td).where(eq(td.eventId, eventId)))),
        ),
      ),
    )
    .orderBy(asc(users.enrollmentYear), asc(users.lastNameKana), asc(users.firstNameKana))
}

/** 通知などに使う対象の表記（例: 広報部・企画部 ＋ 2人）。全員向けなら null */
function targetLabel(divisions: Division[], userCount: number): string | null {
  const parts = [divisions.join('・'), userCount > 0 ? `${userCount}人` : ''].filter(Boolean)
  return parts.length > 0 ? parts.join(' ＋ ') : null
}

/** 一覧・詳細で種類の表示名と色を添える（種類が見つからなければ id と灰色） */
const categoryLabelSql = sql<string>`coalesce((select ${eventCategories.label} from ${eventCategories} where ${eventCategories.id} = ${events.category}), ${events.category})`
const categoryToneSql = sql<CategoryTone>`coalesce((select ${eventCategories.tone} from ${eventCategories} where ${eventCategories.id} = ${events.category}), 'neutral')`

/** イベントの種類が今あるものか確かめて、その行を返す */
async function findCategory(db: Db, id: string) {
  const category = await db.select().from(eventCategories).where(eq(eventCategories.id, id)).get()
  if (!category) throw badRequest('イベントの種類が正しくありません。画面を読み込み直してください')
  return category
}

async function assertUsersExist(db: Db, userIds: string[]) {
  if (userIds.length === 0) return
  const found = await db.select({ id: users.id }).from(users).where(inArray(users.id, userIds))
  if (found.length !== userIds.length) throw badRequest('対象のメンバーが見つかりません。画面を読み込み直してください')
}

/** 対象の指定を送られた内容に置き換える文（イベントの保存と同じ batch で実行する） */
function replaceTargets(db: Db, eventId: string, divisions: Division[], userIds: string[]) {
  return [
    db.delete(td).where(eq(td.eventId, eventId)),
    db.delete(tu).where(eq(tu.eventId, eventId)),
    ...(divisions.length > 0 ? [db.insert(td).values(divisions.map((division) => ({ eventId, division })))] : []),
    ...(userIds.length > 0 ? [db.insert(tu).values(userIds.map((userId) => ({ eventId, userId })))] : []),
  ]
}

export const eventsRoute = new Hono<AppEnv>()
  .use(requireAuth)

  // /:id より先に登録する
  .route('/categories', eventCategoriesRoute)

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
        targetDivisions: sql<string>`(select json_group_array(${td.division}) from ${td} where ${td.eventId} = ${events.id})`.mapWith(
          (value: string) => sortDivisions(JSON.parse(value)),
        ),
        targetUserCount: sql<number>`(select count(*) from ${tu} where ${tu.eventId} = ${events.id})`.mapWith(Number),
        isTarget: isTargetOf(userId),
        categoryLabel: categoryLabelSql,
        categoryTone: categoryToneSql,
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
    const { targetDivisions, targetUserIds: rawUserIds, ...input } = c.req.valid('json')
    const targetUserIds = [...new Set(rawUserIds)]
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const id = crypto.randomUUID()
    const category = await findCategory(db, input.category)
    await assertUsersExist(db, targetUserIds)

    // 作成者は主催者として参加扱いにする
    await db.batch([
      db.insert(events).values({ ...input, id, createdBy: userId }),
      db.insert(eventParticipants).values({ eventId: id, userId, status: 'going' }),
      ...replaceTargets(db, id, targetDivisions, targetUserIds),
    ])

    const organizer = await db
      .select({ lastName: users.lastName, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    const label = targetLabel(targetDivisions, targetUserIds.length)
    const mentionIds = label ? (await findTargetMembers(db, id)).map((m) => m.id).filter((memberId) => memberId !== userId) : []
    runInBackground(
      c,
      notifyEventCreated(c.env, db, { id, ...input, categoryLabel: category.label }, organizer ? `${organizer.lastName} ${organizer.firstName}` : '', {
        label,
        mentionIds,
      }),
    )

    return c.json({ id }, 201)
  })

  .get('/:id', async (c) => {
    const db = createDb(c.env)
    const { userId } = c.get('session')
    const found = await db.query.events.findFirst({
      where: eq(events.id, c.req.param('id')),
      with: {
        targetDivisions: { columns: { division: true } },
        targetUsers: { with: { user: { columns: memberSummaryColumns } } },
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
    if (!found) throw notFound('イベントが見つかりません')

    const { targetDivisions, targetUsers, ...event } = found
    const category = await db.select().from(eventCategories).where(eq(eventCategories.id, event.category)).get()
    const targeted = targetDivisions.length > 0 || targetUsers.length > 0
    const targetMembers = targeted ? await findTargetMembers(db, event.id) : []
    const answered = new Set(event.participants.map((p) => p.userId))
    return c.json({
      event: {
        ...event,
        categoryLabel: category?.label ?? event.category,
        categoryTone: category?.tone ?? ('neutral' as CategoryTone),
        targetDivisions: sortDivisions(targetDivisions.map((t) => t.division)),
        targetUsers: targetUsers.map((t) => t.user),
      },
      canManage: canManage(c.get('session'), event.createdBy),
      /** 自分が対象か（全員向けなら常に true） */
      isTarget: !targeted || targetMembers.some((m) => m.id === userId),
      /** 対象者のうち、まだ出欠を回答していない人 */
      pending: targetMembers.filter((m) => !answered.has(m.id)),
    })
  })

  .put('/:id', validate('json', eventInputSchema), async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    assertCanManage(c.get('session'), event.createdBy)
    const { targetDivisions, targetUserIds: rawUserIds, ...input } = c.req.valid('json')
    const targetUserIds = [...new Set(rawUserIds)]
    await findCategory(db, input.category)
    await assertUsersExist(db, targetUserIds)
    await db.batch([
      db.update(events).set(input).where(eq(events.id, event.id)),
      ...replaceTargets(db, event.id, targetDivisions, targetUserIds),
    ])
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

    // 不参加にしたら担当していた持ち物を手放す
    if (status === 'declined') {
      await db
        .update(eventItems)
        .set({ assigneeId: null, prepared: false })
        .where(and(eq(eventItems.eventId, event.id), eq(eventItems.assigneeId, session.userId)))
    }
    return c.json({ ok: true })
  })

  // 出席・支払いの記録（主催者・管理者）
  .patch('/:id/participants/:userId', validate('json', participantUpdateSchema), async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id'))
    assertCanManage(c.get('session'), event.createdBy)

    const updated = await db
      .update(eventParticipants)
      .set(c.req.valid('json'))
      .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, c.req.param('userId'))))
      .returning({ userId: eventParticipants.userId })
    if (updated.length === 0) throw notFound('参加者が見つかりません')
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
