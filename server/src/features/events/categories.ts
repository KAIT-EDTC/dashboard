import { asc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { eventCategoriesSaveSchema } from '@edtc/shared'
import { createDb } from '../../db'
import { eventCategories, events } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, conflict } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { assertAdmin } from '../../middleware/auth'
import { dropLecturers } from './lecturer'

/** イベントの種類。誰でも読めて、変更は管理者だけが一括で保存する */
export const eventCategoriesRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const categories = await createDb(c.env)
      .select({ id: eventCategories.id, label: eventCategories.label, tone: eventCategories.tone, hasLecturer: eventCategories.hasLecturer })
      .from(eventCategories)
      .orderBy(asc(eventCategories.sortOrder), asc(eventCategories.createdAt))
    return c.json({ categories })
  })

  /**
   * 送られた一覧どおりに種類を追加・名前変更・色変更・並べ替え・削除する（すべて成功するか、何も変わらないか）。
   * イベントは id で種類を持つので、名前を変えてもイベントはそのまま。使用中の種類は削除できない。
   */
  .put('/', validate('json', eventCategoriesSaveSchema), async (c) => {
    assertAdmin(c.get('session'))
    const { categories: next } = c.req.valid('json')
    const db = createDb(c.env)

    const current = await db.select().from(eventCategories)
    const currentById = new Map(current.map((category) => [category.id, category]))
    const keptIds = new Set<string>()
    for (const category of next) {
      if (!category.id) continue
      if (!currentById.has(category.id)) throw badRequest('種類が見つかりません。画面を読み込み直してください')
      if (keptIds.has(category.id)) throw badRequest('同じ種類が重複しています')
      keptIds.add(category.id)
    }
    const duplicated = next.map((category) => category.label).find((label, index, labels) => labels.indexOf(label) !== index)
    if (duplicated) throw conflict(`同じ名前の種類があります: ${duplicated}`)

    const removed = current.filter((category) => !keptIds.has(category.id))
    for (const category of removed) {
      const used = await db.select({ id: events.id }).from(events).where(eq(events.category, category.id)).all()
      if (used.length > 0) throw conflict(`「${category.label}」は${used.length}件のイベントで使われているため削除できません`)
    }

    const renamed = new Set(
      next.flatMap((category) => {
        const before = category.id ? currentById.get(category.id) : undefined
        return before && before.label !== category.label ? [before.id] : []
      }),
    )
    // 講師を置かない設定にした種類は、そのイベントの講師を外す
    const lecturerDropped = next.flatMap((category) => (category.id && currentById.get(category.id)?.hasLecturer && !category.hasLecturer ? [category.id] : []))

    // 名前の入れ替えなどでも一意制約に当たらないよう、先に仮の名前へ退避してから確定させる
    const statements = [
      ...[...renamed].map((id) => db.update(eventCategories).set({ label: `__renaming__${id}` }).where(eq(eventCategories.id, id))),
      ...removed.map((category) => db.delete(eventCategories).where(eq(eventCategories.id, category.id))),
      ...next.map((category, index) =>
        category.id
          ? db
              .update(eventCategories)
              .set({ label: category.label, tone: category.tone, hasLecturer: category.hasLecturer, sortOrder: index })
              .where(eq(eventCategories.id, category.id))
          : db.insert(eventCategories).values({ id: crypto.randomUUID(), label: category.label, tone: category.tone, hasLecturer: category.hasLecturer, sortOrder: index }),
      ),
      ...(lecturerDropped.length > 0 ? dropLecturers(db, inArray(events.category, lecturerDropped)) : []),
    ]
    await db.batch(statements as [(typeof statements)[number], ...typeof statements])
    return c.json({ ok: true })
  })
