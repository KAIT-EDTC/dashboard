import { and, asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { lightReportSchema, nowInJst } from '@edtc/shared'
import { createDb, memberSummaryColumns, type Db } from '../../db'
import { eventLightReports, eventParticipants, events } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { isReportTarget } from '../reports/queries'
import { rulesOf } from './category-rules'

/**
 * 簡易報告書（事後報告だけ。文字数の上限も承認もない）。
 * 書いた内容はすぐにイベントページへ名前付きで載り、本人はいつでも直せる・消せる
 */

/** イベント詳細に載せる簡易報告書（書いた順） */
export function lightReportsOf(db: Db, eventId: string) {
  return db.query.eventLightReports.findMany({
    columns: { userId: true, body: true, createdAt: true, updatedAt: true },
    with: { user: { columns: memberSummaryColumns } },
    where: eq(eventLightReports.eventId, eventId),
    orderBy: asc(eventLightReports.createdAt),
  })
}

/**
 * 簡易報告書を書けない理由（書けるなら null）。
 * 書けるのは、簡易報告書を書く種類のイベントに参加した人（参加と回答した・出席した）で、イベントが始まってから
 */
export function lightReportBlocker(
  event: { startsAt: string },
  hasLightReport: boolean,
  participant: Pick<typeof eventParticipants.$inferSelect, 'status' | 'attended'> | undefined,
): string | null {
  if (!hasLightReport) return 'この種類のイベントは簡易報告書を書きません'
  if (!participant || !isReportTarget(participant)) return 'このイベントに参加した人だけが簡易報告書を書けます'
  if (event.startsAt > nowInJst()) return '簡易報告書はイベントが始まってから書けます'
  return null
}

/** /api/events/:id/light-report — 自分の簡易報告書を書く・直す・消す */
export const eventLightReportsRoute = new Hono<AppEnv>()
  // 書く・直す（1イベントにつき1人1件。保存するとすぐイベントページに載る）
  .put('/', validate('json', lightReportSchema), async (c) => {
    const { body } = c.req.valid('json')
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const event = await db.select({ id: events.id, startsAt: events.startsAt, category: events.category }).from(events).where(eq(events.id, c.req.param('id')!)).get()
    if (!event) throw notFound('イベントが見つかりません')

    const [rules, participant] = await Promise.all([
      rulesOf(db, event.category),
      db
        .select({ status: eventParticipants.status, attended: eventParticipants.attended })
        .from(eventParticipants)
        .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, userId)))
        .get(),
    ])
    const blocker = lightReportBlocker(event, rules.hasLightReport, participant)
    if (blocker) throw badRequest(blocker)

    await db
      .insert(eventLightReports)
      .values({ eventId: event.id, userId, body })
      .onConflictDoUpdate({
        target: [eventLightReports.eventId, eventLightReports.userId],
        set: { body, updatedAt: new Date().toISOString() },
      })
    return c.json({ ok: true })
  })

  // 消す（簡易報告書を書かない種類に変わった後や、参加を取り消した後でも、自分の分は消せる）
  .delete('/', async (c) => {
    const { userId } = c.get('session')
    await createDb(c.env)
      .delete(eventLightReports)
      .where(and(eq(eventLightReports.eventId, c.req.param('id')!), eq(eventLightReports.userId, userId)))
    return c.json({ ok: true })
  })
