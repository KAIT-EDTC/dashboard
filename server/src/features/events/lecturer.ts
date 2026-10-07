import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm'
import type { Db } from '../../db'
import { eventCategories, eventParticipants, events } from '../../db/schema'

/** 講師を置くかはイベントの種類で決まる（「イベント設定」で管理者が変える）。種類が見つからなければ置く */
export const eventHasLecturer = sql<boolean>`coalesce((select ${eventCategories.hasLecturer} from ${eventCategories} where ${eventCategories.id} = ${events.category}), 1)`.mapWith(Boolean)

/** 種類ごとに講師を置くか。読み込んだイベント（category を持つもの）に当てはめる */
export async function lecturerByCategory(db: Db): Promise<(category: string) => boolean> {
  const rows = await db.select({ id: eventCategories.id, hasLecturer: eventCategories.hasLecturer }).from(eventCategories)
  const map = new Map(rows.map((row) => [row.id, row.hasLecturer]))
  return (category) => map.get(category) ?? true
}

/**
 * 講師を置かない種類になったイベントから講師を外す文（呼び出し側で batch に入れる）。
 * まとめ報告書の担当者が未指名なら、講師だった人を指名したことにして担当を引き継ぐ
 */
export function dropLecturers(db: Db, target: SQL) {
  const ep = eventParticipants
  return [
    db
      .update(events)
      .set({ summaryWriterId: sql`(select ${ep.userId} from ${ep} where ${ep.eventId} = ${events.id} and ${ep.role} = 'lecturer' limit 1)` })
      .where(and(target, isNull(events.summaryWriterId))),
    db
      .update(ep)
      .set({ role: 'assistant' })
      .where(and(eq(ep.role, 'lecturer'), inArray(ep.eventId, db.select({ id: events.id }).from(events).where(target)))),
  ] as const
}
