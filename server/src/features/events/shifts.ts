import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import {
  availabilitySchema,
  dayTime,
  shiftDays,
  shiftHours,
  shiftJoinSchema,
  timesOverlap,
} from '@edtc/shared'
import type { Db } from '../../db'
import { createDb } from '../../db'
import { eventParticipants, events, eventShiftMembers, eventShifts } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, conflict, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'

type ShiftSettings = Pick<typeof events.$inferSelect, 'startsAt' | 'endsAt' | 'hasShifts' | 'shiftStartHour' | 'shiftEndHour' | 'shiftSplitHour'>

/** イベントの設定から作る枠: 日ごとに、区切りがあれば午前・午後、無ければ1枠 */
function slotsOf(event: ShiftSettings) {
  const { shiftStartHour: start, shiftEndHour: end, shiftSplitHour: split } = event
  if (!event.hasShifts || start === null || end === null) return []
  return shiftDays(event).flatMap((day) =>
    (split === null
      ? [{ label: 'シフト', from: start, to: end }]
      : [
          { label: '午前', from: start, to: split },
          { label: '午後', from: split, to: end },
        ]
    ).map(({ label, from, to }) => ({ label, startsAt: dayTime(day, from), endsAt: dayTime(day, to) })),
  )
}

const sameSlots = (a: ShiftSettings, b: ShiftSettings) => JSON.stringify(slotsOf(a)) === JSON.stringify(slotsOf(b))

/**
 * イベントの保存に合わせてシフトの枠をそろえる文（batch に入れる）。
 * シフトなしにしたら枠を消す。時間帯などを変えたら作り直し、入っていた人は同じ日の同じ枠（午前・午後）に移す。
 * 同じ名前の枠が無ければ（区切りを足した・外したとき）、同じ日の時間が重なる枠に移す
 */
export async function syncShifts(db: Db, eventId: string, next: ShiftSettings, prev: ShiftSettings | null) {
  const removeAll = db.delete(eventShifts).where(eq(eventShifts.eventId, eventId))
  if (!next.hasShifts) return prev?.hasShifts ? [removeAll] : []
  if (prev?.hasShifts && sameSlots(prev, next)) return []

  const members = prev
    ? await db
        .select({ userId: eventShiftMembers.userId, label: eventShifts.label, startsAt: eventShifts.startsAt, endsAt: eventShifts.endsAt })
        .from(eventShiftMembers)
        .innerJoin(eventShifts, eq(eventShifts.id, eventShiftMembers.shiftId))
        .where(eq(eventShifts.eventId, eventId))
    : []
  const slots = slotsOf(next).map((slot) => ({ ...slot, id: crypto.randomUUID(), eventId }))
  const moved = new Map<string, { shiftId: string; userId: string }>()
  for (const member of members) {
    const sameDay = slots.filter((slot) => slot.startsAt.slice(0, 10) === member.startsAt.slice(0, 10))
    const to = sameDay.find((slot) => slot.label === member.label) ?? sameDay.find((slot) => timesOverlap(slot, member))
    if (to) moved.set(`${to.id}:${member.userId}`, { shiftId: to.id, userId: member.userId })
  }
  return [
    removeAll,
    ...(slots.length > 0 ? [db.insert(eventShifts).values(slots)] : []),
    ...(moved.size > 0 ? [db.insert(eventShiftMembers).values([...moved.values()])] : []),
  ]
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

/** シフトに入れるのは、参加か未定と回答した人だけ */
async function assertParticipating(db: Db, eventId: string, userId: string) {
  const participant = await db
    .select({ status: eventParticipants.status })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
    .get()
  if (!participant || participant.status === 'declined') throw badRequest('シフトに入るには、先に出欠で「参加」か「未定」と回答してください')
}

/** 同じイベントの別のシフトと時間が重ならないか（1人が同時に2か所には入れない） */
async function assertNoOverlap(db: Db, eventId: string, shift: typeof eventShifts.$inferSelect, userId: string) {
  const others = await db
    .select({ label: eventShifts.label, startsAt: eventShifts.startsAt, endsAt: eventShifts.endsAt })
    .from(eventShiftMembers)
    .innerJoin(eventShifts, eq(eventShifts.id, eventShiftMembers.shiftId))
    .where(and(eq(eventShifts.eventId, eventId), eq(eventShiftMembers.userId, userId), ne(eventShifts.id, shift.id)))
  const clash = others.find((other) => timesOverlap(other, shift))
  if (clash) throw conflict(`同じ時間帯の「${clash.label}」（${clash.startsAt.slice(11)}〜${clash.endsAt.slice(11)}）に入っています`)
}

/** /api/events/:id/shifts — 枠はイベントの設定から作る。参加者は自分で入る／抜けると、入ったシフトの中で出れない時間を決める */
export const eventShiftsRoute = new Hono<AppEnv>()
  // 入っているシフトの中で、自分が出れない時間（1時間ごと）を置き換える。シフトの外の時間は捨てる
  .put('/availability', validate('json', availabilitySchema), async (c) => {
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const event = await findEvent(db, c.req.param('id')!)
    if (!event.hasShifts) throw badRequest('このイベントにはシフトがありません')

    const mine = await db
      .select({ startsAt: eventShifts.startsAt, endsAt: eventShifts.endsAt })
      .from(eventShiftMembers)
      .innerJoin(eventShifts, eq(eventShifts.id, eventShiftMembers.shiftId))
      .where(and(eq(eventShifts.eventId, event.id), eq(eventShiftMembers.userId, userId)))
    const slots = new Set(mine.flatMap(shiftHours))
    const unavailable = [...new Set(c.req.valid('json').unavailable)].filter((slot) => slots.has(slot)).sort()

    const target = and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, userId))
    await db.update(eventParticipants).set({ unavailable }).where(target)
    return c.json({ ok: true })
  })

  // 自分がシフトに入る／抜ける
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

    await assertParticipating(db, event.id, userId)
    await assertNoOverlap(db, event.id, shift, userId)
    await db.insert(eventShiftMembers).values({ shiftId: shift.id, userId }).onConflictDoNothing()
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
