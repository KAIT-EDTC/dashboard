import { asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { blogTagsSaveSchema } from '@edtc/shared'
import { createDb } from '../../db'
import { blogPosts, blogTags } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, conflict } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { assertAdmin } from '../../middleware/auth'

/** ブログのタグ。誰でも読めて、変更は管理者だけが一括で保存する */
export const blogTagsRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const tags = await createDb(c.env)
      .select({ id: blogTags.id, label: blogTags.label })
      .from(blogTags)
      .orderBy(asc(blogTags.sortOrder), asc(blogTags.createdAt))
    return c.json({ tags })
  })

  /**
   * 送られた一覧どおりにタグを追加・名前変更・並べ替え・削除する（すべて成功するか、何も変わらないか）。
   * 名前を変えたタグを付けている記事のタグも新しい名前にそろえる。使用中のタグは削除できない。
   */
  .put('/', validate('json', blogTagsSaveSchema), async (c) => {
    assertAdmin(c.get('session'))
    const { tags: next } = c.req.valid('json')
    const db = createDb(c.env)

    const current = await db.select().from(blogTags)
    const currentById = new Map(current.map((tag) => [tag.id, tag]))
    const keptIds = new Set<string>()
    for (const tag of next) {
      if (!tag.id) continue
      if (!currentById.has(tag.id)) throw badRequest('タグが見つかりません。画面を読み込み直してください')
      if (keptIds.has(tag.id)) throw badRequest('同じタグが重複しています')
      keptIds.add(tag.id)
    }
    const duplicated = next.map((tag) => tag.label).find((label, index, labels) => labels.indexOf(label) !== index)
    if (duplicated) throw conflict(`同じ名前のタグがあります: ${duplicated}`)

    const removed = current.filter((tag) => !keptIds.has(tag.id))
    const renamed = new Map<string, string>() // 旧名 → 新名
    for (const tag of next) {
      const before = tag.id ? currentById.get(tag.id) : undefined
      if (before && before.label !== tag.label) renamed.set(before.label, tag.label)
    }

    // 記事側にはタグの表示名で保存している
    const posts = await db.select({ id: blogPosts.id, tags: blogPosts.tags }).from(blogPosts)
    for (const tag of removed) {
      const used = posts.filter((post) => post.tags.includes(tag.label)).length
      if (used > 0) throw conflict(`「${tag.label}」は${used}件の記事で使われているため削除できません`)
    }

    // 名前の入れ替えなどでも一意制約に当たらないよう、先に仮の名前へ退避してから確定させる
    const statements = [
      ...current.filter((tag) => renamed.has(tag.label)).map((tag) => db.update(blogTags).set({ label: `__renaming__${tag.id}` }).where(eq(blogTags.id, tag.id))),
      ...removed.map((tag) => db.delete(blogTags).where(eq(blogTags.id, tag.id))),
      ...next.map((tag, index) =>
        tag.id
          ? db.update(blogTags).set({ label: tag.label, sortOrder: index }).where(eq(blogTags.id, tag.id))
          : db.insert(blogTags).values({ id: crypto.randomUUID(), label: tag.label, sortOrder: index }),
      ),
      ...posts
        .filter((post) => post.tags.some((name) => renamed.has(name)))
        .map((post) =>
          db
            .update(blogPosts)
            .set({ tags: post.tags.map((name) => renamed.get(name) ?? name) })
            .where(eq(blogPosts.id, post.id)),
        ),
    ]
    if (statements.length > 0) await db.batch(statements as [(typeof statements)[number], ...typeof statements])
    return c.json({ ok: true })
  })
