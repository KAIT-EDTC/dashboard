import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import {
  availabilitySchema,
  dayTime,
  shiftDays,
  shiftHourSlots,
  shiftInputSchema,
  shiftJoinSchema,
  shiftUpdateSchema,
  timesOverlap,
  unavailableDuring,
} from '@edtc/shared'
import type { Db } from '../../db'
import { createDb } from '../../db'
import { eventParticipants, events, eventShiftMembers, eventShifts, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, conflict, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { assertCanManage } from '../../middleware/auth'

type TimeRange = { startsAt: string; endsAt: string }

type ShiftSettings = Pick<typeof events.$inferSelect, 'startsAt' | 'endsAt' | 'hasShifts' | 'shiftStartHour' | 'shiftEndHour' | 'shiftSplitHour' | 'shiftCapacity'>

/** イベントの設定から作る枠: 日ごとに、区切りがあれば午前・午後、無ければ1枠 */
function slotsOf(event: ShiftSettings) {
  const { shiftStartHour: start, shiftEndHour: end, shiftSplitHour: split, shiftCapacity: capacity } = event
  if (!event.hasShifts || start === null || end === null) return []
  return shiftDays(event).flatMap((day) =>
    (split === null
      ? [{ label: 'シフト', from: start, to: end }]
      : [
          { label: '午前', from: start, to: split },
          { label: '午後', from: split, to: end },
        ]
    ).map(({ label, from, to }) => ({ label, startsAt: dayTime(day, from), endsAt: dayTime(day, to), capacity: capacity ?? 1 })),
  )
}

const sameSlots = (a: ShiftSettings, b: ShiftSettings) => JSON.stringify(slotsOf(a)) === JSON.stringify(slotsOf(b))

/**
 * イベントの保存に合わせてシフトの枠をそろえる文（batch に入れる）。
 * シフトなしにしたら枠を消す。時間帯などを変えたら作り直すが、もう誰かが入っている枠があれば残す（イベントページで直す）
 */
export async function syncShifts(db: Db, eventId: string, next: ShiftSettings, prev: ShiftSettings | null) {
  const removeAll = db.delete(eventShifts).where(eq(eventShifts.eventId, eventId))
  if (!next.hasShifts) return prev?.hasShifts ? [removeAll] : []
  const existing = prev ? await db.select({ id: eventShifts.id }).from(eventShifts).where(eq(eventShifts.eventId, eventId)) : []
  if (existing.length > 0) {
    if (prev && sameSlots(prev, next)) return []
    const assigned = await db
      .select({ shiftId: eventShiftMembers.shiftId })
      .from(eventShiftMembers)
      .where(inArray(eventShiftMembers.shiftId, existing.map((shift) => shift.id)))
      .get()
    if (assigned) return []
  }
  const slots = slotsOf(next)
  return [removeAll, ...(slots.length > 0 ? [db.insert(eventShifts).values(slots.map((slot) => ({ ...slot, id: crypto.randomUUID(), eventId })))] : [])]
}

async function findEvent(db: Db, id: string) {
  const event = await db.select().from(events).where(eq(events.id, id)).get()
  if (!event) throw notFound('イベントが見つかりません')
  return event
}

async function findShift(db: Db, eventId: string, shiftId: string) {
  const shift = await db
    .select()
    .from(eventShifts)
    .where(and(eq(eventShifts.id, shiftId), eq(eventShifts.eventId, eventId)))
    .get()
  if (!shift) throw notFound('シフトが見つかりません')
  return shift
}

/** シフトに入れるのは、参加か未定と回答していて、その時間に出れる人だけ */
async function assertAssignable(db: Db, eventId: string, range: TimeRange, userIds: string[], { self = false } = {}) {
  if (userIds.length === 0) return
  const found = await db
    .select({ userId: eventParticipants.userId, unavailable: eventParticipants.unavailable, lastName: users.lastName, firstName: users.firstName })
    .from(eventParticipants)
    .innerJoin(users, eq(users.id, eventParticipants.userId))
    .where(and(eq(eventParticipants.eventId, eventId), inArray(eventParticipants.userId, userIds), ne(eventParticipants.status, 'declined')))
  if (found.length !== userIds.length) {
    throw badRequest(
      self ? 'シフトに入るには、先に出欠で「参加」か「未定」と回答してください' : 'シフトに入れるのは、参加か未定と回答した人だけです。画面を読み込み直してください',
    )
  }
  const busy = found.find((p) => unavailableDuring(p.unavailable, range))
  if (busy) throw conflict(`${self ? 'あなた' : `${busy.lastName} ${busy.firstName}さん`}は、この時間に出れないと回答しています`)
}

/** 同じイベントの別のシフトと時間が重なる人がいないか（1人が同時に2か所には入れない）。self は自分で入るとき */
async function assertNoOverlap(db: Db, eventId: string, shiftId: string | null, range: TimeRange, userIds: string[], { self = false } = {}) {
  if (userIds.length === 0) return
  const others = await db
    .select({
      label: eventShifts.label,
      startsAt: eventShifts.startsAt,
      endsAt: eventShifts.endsAt,
      lastName: users.lastName,
      firstName: users.firstName,
    })
    .from(eventShiftMembers)
    .innerJoin(eventShifts, eq(eventShifts.id, eventShiftMembers.shiftId))
    .innerJoin(users, eq(users.id, eventShiftMembers.userId))
    .where(
      and(
        eq(eventShifts.eventId, eventId),
        inArray(eventShiftMembers.userId, userIds),
        ...(shiftId ? [ne(eventShifts.id, shiftId)] : []),
      ),
    )
  const clash = others.find((other) => timesOverlap(other, range))
  if (clash) {
    const who = self ? 'あなた' : `${clash.lastName} ${clash.firstName}さん`
    throw conflict(`${who}は、同じ時間帯の「${clash.label}」（${clash.startsAt.slice(11)}〜${clash.endsAt.slice(11)}）に入っています`)
  }
}

/** 入る人を送られた内容に置き換える文（batch に入れる） */
function replaceMembers(db: Db, shiftId: string, userIds: string[]) {
  return [
    db.delete(eventShiftMembers).where(eq(eventShiftMembers.shiftId, shiftId)),
    ...(userIds.length > 0 ? [db.insert(eventShiftMembers).values(userIds.map((userId) => ({ shiftId, userId })))] : []),
  ]
}

/** /api/events/:id/shifts — シフトの作成・編集・削除は主催者と管理者、入る／抜けるは参加者本人 */
export const eventShiftsRoute = new Hono<AppEnv>()
  .post('/', validate('json', shiftInputSchema), async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id')!)
    assertCanManage(c.get('session'), event.createdBy)
    if (!event.hasShifts) throw badRequest('先にイベントの編集で「シフトあり」にしてください')
    const { memberIds: rawMemberIds, ...input } = c.req.valid('json')
    const memberIds = [...new Set(rawMemberIds)]
    if (memberIds.length > input.capacity) throw badRequest(`入る人が人数（${input.capacity}人）を超えています`)
    await assertAssignable(db, event.id, input, memberIds)
    await assertNoOverlap(db, event.id, null, input, memberIds)

    const id = crypto.randomUUID()
    await db.batch([db.insert(eventShifts).values({ ...input, id, eventId: event.id }), ...replaceMembers(db, id, memberIds)])
    return c.json({ id }, 201)
  })

  .patch('/:shiftId', validate('json', shiftUpdateSchema), async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id')!)
    assertCanManage(c.get('session'), event.createdBy)
    const shift = await findShift(db, event.id, c.req.param('shiftId'))
    const { memberIds: rawMemberIds, ...input } = c.req.valid('json')

    const next = { ...shift, ...input }
    if (next.endsAt <= next.startsAt) throw badRequest('終了時刻は開始時刻より後にしてください')
    const memberIds = rawMemberIds
      ? [...new Set(rawMemberIds)]
      : (await db.select({ userId: eventShiftMembers.userId }).from(eventShiftMembers).where(eq(eventShiftMembers.shiftId, shift.id))).map((m) => m.userId)
    if (memberIds.length > next.capacity) throw badRequest(`入る人が人数（${next.capacity}人）を超えています`)
    await assertAssignable(db, event.id, next, memberIds)
    await assertNoOverlap(db, event.id, shift.id, next, memberIds)

    await db.batch([
      db.update(eventShifts).set(input).where(eq(eventShifts.id, shift.id)),
      ...(rawMemberIds ? replaceMembers(db, shift.id, memberIds) : []),
    ])
    return c.json({ ok: true })
  })

  .delete('/:shiftId', async (c) => {
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id')!)
    assertCanManage(c.get('session'), event.createdBy)
    await db.delete(eventShifts).where(and(eq(eventShifts.id, c.req.param('shiftId')), eq(eventShifts.eventId, event.id)))
    return c.json({ ok: true })
  })

  // 自分の出れない時間（1時間ごと）を置き換える。入っているシフトの時間は出れないにできない
  .put('/availability', validate('json', availabilitySchema), async (c) => {
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id')!)
    if (!event.hasShifts) throw badRequest('このイベントにはシフトがありません')
    const slots = new Set(shiftHourSlots(event))
    const unavailable = [...new Set(c.req.valid('json').unavailable)].filter((slot) => slots.has(slot)).sort()

    const target = and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, userId))
    const participant = await db.select({ status: eventParticipants.status }).from(eventParticipants).where(target).get()
    if (!participant || participant.status === 'declined') throw badRequest('出れない時間を入れるには、先に出欠で「参加」か「未定」と回答してください')

    const mine = await db
      .select({ label: eventShifts.label, startsAt: eventShifts.startsAt, endsAt: eventShifts.endsAt })
      .from(eventShiftMembers)
      .innerJoin(eventShifts, eq(eventShifts.id, eventShiftMembers.shiftId))
      .where(and(eq(eventShifts.eventId, event.id), eq(eventShiftMembers.userId, userId)))
    const clash = mine.find((shift) => unavailableDuring(unavailable, shift))
    if (clash) {
      throw conflict(`「${clash.label}」（${clash.startsAt.slice(5, 10).replace('-', '/')} ${clash.startsAt.slice(11)}〜${clash.endsAt.slice(11)}）のシフトに入っているため、その時間は出れないにできません。先にシフトを抜けてください`)
    }

    await db.update(eventParticipants).set({ unavailable }).where(target)
    return c.json({ ok: true })
  })

  // 自分がシフトに入る（空きがあるときだけ）／抜ける
  .put('/:shiftId/me', validate('json', shiftJoinSchema), async (c) => {
    const { joined } = c.req.valid('json')
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id')!)
    const shift = await findShift(db, event.id, c.req.param('shiftId'))

    if (!joined) {
      await db.delete(eventShiftMembers).where(and(eq(eventShiftMembers.shiftId, shift.id), eq(eventShiftMembers.userId, userId)))
      return c.json({ ok: true })
    }

    await assertAssignable(db, event.id, shift, [userId], { self: true })
    await assertNoOverlap(db, event.id, shift.id, shift, [userId], { self: true })

    // 同時に申し込まれても人数を超えないよう、空きを確かめながら入れる
    const m = eventShiftMembers
    const result = await db.run(sql`
      insert into ${m} (${sql.identifier(m.shiftId.name)}, ${sql.identifier(m.userId.name)})
      select ${shift.id}, ${userId}
      where (select count(*) from ${m} where ${m.shiftId} = ${shift.id}) < ${shift.capacity}
      on conflict do nothing
    `)
    if (result.meta.changes === 0) {
      const already = await db
        .select({ userId: m.userId })
        .from(m)
        .where(and(eq(m.shiftId, shift.id), eq(m.userId, userId)))
        .get()
      if (!already) throw conflict('このシフトはもう埋まっています')
    }
    return c.json({ ok: true })
  })

/** 自分が入っている、これからのシフト（ホーム用） */
export function myUpcomingShifts(db: Db, userId: string, now: string) {
  return db
    .select({
      id: eventShifts.id,
      label: eventShifts.label,
      startsAt: eventShifts.startsAt,
      endsAt: eventShifts.endsAt,
      eventId: events.id,
      eventTitle: events.title,
    })
    .from(eventShiftMembers)
    .innerJoin(eventShifts, eq(eventShifts.id, eventShiftMembers.shiftId))
    .innerJoin(events, eq(events.id, eventShifts.eventId))
    .where(and(eq(eventShiftMembers.userId, userId), sql`${eventShifts.endsAt} >= ${now}`))
    .orderBy(asc(eventShifts.startsAt))
}

/** 不参加にした人を、そのイベントのシフトから外す文 */
export function leaveAllShifts(db: Db, eventId: string, userId: string) {
  return db
    .delete(eventShiftMembers)
    .where(
      and(
        eq(eventShiftMembers.userId, userId),
        inArray(eventShiftMembers.shiftId, db.select({ id: eventShifts.id }).from(eventShifts).where(eq(eventShifts.eventId, eventId))),
      ),
    )
}
