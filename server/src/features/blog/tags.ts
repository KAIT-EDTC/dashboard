import { asc, eq, max } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { blogTagInputSchema } from '@edtc/shared'
import { createDb, type Db } from '../../db'
import { blogPosts, blogTags } from '../../db/schema'
import type { AppEnv } from '../../env'
import { conflict, notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { assertAdmin } from '../../middleware/auth'

const listTags = (db: Db) =>
  db.select({ id: blogTags.id, label: blogTags.label }).from(blogTags).orderBy(asc(blogTags.sortOrder), asc(blogTags.createdAt))

async function findTag(db: Db, id: string) {
  const tag = await db.select().from(blogTags).where(eq(blogTags.id, id)).get()
  if (!tag) throw notFound('タグが見つかりません')
  return tag
}

async function assertLabelAvailable(db: Db, label: string, exceptId?: string) {
  const same = await db.select({ id: blogTags.id }).from(blogTags).where(eq(blogTags.label, label)).get()
  if (same && same.id !== exceptId) throw conflict('同じ名前のタグがすでにあります')
}

/** そのタグを使っている記事（記事側にはタグの表示名で保存している） */
async function postsUsing(db: Db, label: string) {
  const posts = await db.select({ id: blogPosts.id, tags: blogPosts.tags }).from(blogPosts)
  return posts.filter((post) => post.tags.includes(label))
}

/** ブログのタグ。誰でも読めて、追加・名前の変更・並べ替え・削除は管理者だけ */
export const blogTagsRoute = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ tags: await listTags(createDb(c.env)) }))

  .post('/', validate('json', blogTagInputSchema), async (c) => {
    assertAdmin(c.get('session'))
    const { label } = c.req.valid('json')
    const db = createDb(c.env)
    await assertLabelAvailable(db, label)
    const last = await db.select({ value: max(blogTags.sortOrder) }).from(blogTags).get()
    const id = crypto.randomUUID()
    await db.insert(blogTags).values({ id, label, sortOrder: (last?.value ?? -1) + 1 })
    return c.json({ id }, 201)
  })

  // 先頭から順に ids を並べる
  .put('/order', validate('json', z.object({ ids: z.array(z.string()).max(200) })), async (c) => {
    assertAdmin(c.get('session'))
    const { ids } = c.req.valid('json')
    const updates = ids.map((id, index) => createDb(c.env).update(blogTags).set({ sortOrder: index }).where(eq(blogTags.id, id)))
    if (updates.length > 0) await createDb(c.env).batch(updates as [(typeof updates)[number], ...typeof updates])
    return c.json({ ok: true })
  })

  // 名前を変えたら、そのタグを付けている記事のタグも新しい名前にそろえる
  .patch('/:id', validate('json', blogTagInputSchema), async (c) => {
    assertAdmin(c.get('session'))
    const { label } = c.req.valid('json')
    const db = createDb(c.env)
    const tag = await findTag(db, c.req.param('id'))
    if (tag.label === label) return c.json({ ok: true })
    await assertLabelAvailable(db, label, tag.id)

    const posts = await postsUsing(db, tag.label)
    const renamed = [
      db.update(blogTags).set({ label }).where(eq(blogTags.id, tag.id)),
      ...posts.map((post) =>
        db
          .update(blogPosts)
          .set({ tags: post.tags.map((name) => (name === tag.label ? label : name)) })
          .where(eq(blogPosts.id, post.id)),
      ),
    ] as const
    await db.batch(renamed as unknown as [(typeof renamed)[number], ...(typeof renamed)[number][]])
    return c.json({ ok: true, updatedPosts: posts.length })
  })

  .delete('/:id', async (c) => {
    assertAdmin(c.get('session'))
    const db = createDb(c.env)
    const tag = await findTag(db, c.req.param('id'))
    const posts = await postsUsing(db, tag.label)
    if (posts.length > 0) {
      throw conflict(`${posts.length}件の記事で使われているため削除できません。名前の変更で対応してください`)
    }
    await db.delete(blogTags).where(eq(blogTags.id, tag.id))
    return c.json({ ok: true })
  })
