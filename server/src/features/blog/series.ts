import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { blogSeriesSaveSchema } from '@edtc/shared'
import { createDb } from '../../db'
import { blogPosts, blogSeries } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, conflict } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { assertAdmin } from '../../middleware/auth'
import { listSeries } from './queries'

/** ブログのイベント種別。誰でも読めて、変更は管理者だけが一括で保存する */
export const blogSeriesRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    return c.json({ series: await listSeries(createDb(c.env)) })
  })

  /**
   * 送られた一覧どおりに種別を追加・名前変更・並べ替え・削除する（すべて成功するか、何も変わらないか）。
   * id は記事IDの一部なので変えられない（同じ id の行は名前だけが変わる）。記事が使っている種別は削除できない。
   */
  .put('/', validate('json', blogSeriesSaveSchema), async (c) => {
    assertAdmin(c.get('session'))
    const { series: next } = c.req.valid('json')
    const db = createDb(c.env)

    const ids = next.map((series) => series.id)
    const duplicatedId = ids.find((id, index) => ids.indexOf(id) !== index)
    if (duplicatedId) throw badRequest(`同じIDの種別があります: ${duplicatedId}`)
    const duplicatedLabel = next.map((series) => series.label).find((label, index, labels) => labels.indexOf(label) !== index)
    if (duplicatedLabel) throw conflict(`同じ名前の種別があります: ${duplicatedLabel}`)

    const current = await db.select().from(blogSeries)
    const currentById = new Map(current.map((series) => [series.id, series]))
    const removed = current.filter((series) => !ids.includes(series.id))
    for (const series of removed) {
      const used = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.series, series.id)).all()
      if (used.length > 0) throw conflict(`「${series.label}」は${used.length}件の記事で使われているため削除できません`)
    }

    const renamed = next.filter((series) => {
      const before = currentById.get(series.id)
      return before && before.label !== series.label
    })
    // 名前の入れ替えなどでも一意制約に当たらないよう、先に仮の名前へ退避してから確定させる
    const statements = [
      ...renamed.map((series) => db.update(blogSeries).set({ label: `__renaming__${series.id}` }).where(eq(blogSeries.id, series.id))),
      ...removed.map((series) => db.delete(blogSeries).where(eq(blogSeries.id, series.id))),
      ...next.map((series, index) =>
        currentById.has(series.id)
          ? db.update(blogSeries).set({ label: series.label, sortOrder: index }).where(eq(blogSeries.id, series.id))
          : db.insert(blogSeries).values({ id: series.id, label: series.label, sortOrder: index }),
      ),
    ]
    await db.batch(statements as [(typeof statements)[number], ...typeof statements])
    return c.json({ ok: true })
  })
