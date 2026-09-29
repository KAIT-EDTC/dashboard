import { and, desc, eq, inArray, lt, ne, notInArray, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import {
  blogPostInputSchema,
  buildArticleId,
  IMAGE_FILE_PATTERN,
  MAX_IMAGE_BYTES,
  referencedImages,
  validateForSubmit,
} from '@edtc/shared'
import { createDb, memberSummaryColumns } from '../../db'
import { blogImages, blogPosts, events, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import { runInBackground } from '../../lib/background'
import { base64ToBytes, bytesToBase64 } from '../../lib/base64'
import { badRequest, conflict, notFound } from '../../lib/errors'
import { isGitHubConfigured } from '../../lib/github'
import { validate } from '../../lib/validator'
import { assertCanManage, canManage, requireAuth } from '../../middleware/auth'
import { contentOf, hasUnsubmittedChanges, imagesOf } from './content'
import { notifySubmitted } from './notifications'
import { BlogPublisher } from './publisher'
import { assertCanView, authorLabelOf, findPost } from './queries'

const WEBP_MAGIC = { riff: 'RIFF', webp: 'WEBP' }
const isWebp = (bytes: Uint8Array) =>
  String.fromCharCode(...bytes.subarray(0, 4)) === WEBP_MAGIC.riff &&
  String.fromCharCode(...bytes.subarray(8, 12)) === WEBP_MAGIC.webp

/** img-xxxxxxxx.webp（記事フォルダ内で一意） */
function newImageFileName(): string {
  const random = crypto.getRandomValues(new Uint8Array(8))
  return `img-${[...random].map((b) => (b % 36).toString(36)).join('')}.webp`
}

export const blogRoute = new Hono<AppEnv>()
  .use(requireAuth)

  .get('/posts', validate('query', z.object({ scope: z.enum(['mine', 'all']).default('all') })), async (c) => {
    const { scope } = c.req.valid('query')
    const { userId } = c.get('session')
    const posts = await createDb(c.env).query.blogPosts.findMany({
      columns: { body: false, submittedContent: false, description: false },
      with: { author: { columns: memberSummaryColumns } },
      where:
        scope === 'mine'
          ? eq(blogPosts.authorId, userId)
          : or(ne(blogPosts.status, 'draft'), eq(blogPosts.authorId, userId)),
      orderBy: desc(blogPosts.updatedAt),
    })
    return c.json({ posts })
  })

  // 下書きを作る。イベントから作る場合はタイトルと日付を引き継ぐ
  .post('/posts', validate('json', z.object({ eventId: z.string().optional() })), async (c) => {
    const { eventId } = c.req.valid('json')
    const { userId } = c.get('session')
    const db = createDb(c.env)
    const author = await db
      .select({ lastName: users.lastName, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, userId))
      .get()
    const event = eventId
      ? await db.select({ title: events.title, startsAt: events.startsAt }).from(events).where(eq(events.id, eventId)).get()
      : undefined

    const id = crypto.randomUUID()
    await db.insert(blogPosts).values({
      id,
      authorId: userId,
      authorName: author ? `${author.lastName}　${author.firstName}` : '',
      title: event?.title ?? '',
      eventDate: event?.startsAt.slice(0, 10) ?? '',
    })
    return c.json({ id }, 201)
  })

  .get('/posts/:id', async (c) => {
    const db = createDb(c.env)
    const session = c.get('session')
    const post = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, c.req.param('id')),
      with: { author: { columns: memberSummaryColumns } },
    })
    if (!post) throw notFound('記事が見つかりません')
    assertCanView(session, post)
    const { submittedContent: _snapshot, ...rest } = post
    return c.json({
      post: rest,
      canEdit: canManage(session, post.authorId),
      hasUnsubmittedChanges: hasUnsubmittedChanges(post),
      githubConfigured: isGitHubConfigured(c.env),
    })
  })

  .put('/posts/:id', validate('json', blogPostInputSchema), async (c) => {
    const input = c.req.valid('json')
    const db = createDb(c.env)
    const post = await findPost(db, c.req.param('id'))
    assertCanManage(c.get('session'), post.authorId)
    if (post.publishedAt && buildArticleId(input.eventDate, input.slug) !== post.articleId) {
      throw badRequest('公開済みの記事は日付と記事IDを変更できません')
    }

    // 使われなくなった画像を消す。提出済みの内容が参照している画像と、
    // 保存と入れ違いでアップロードされたばかりの画像（1時間以内）は残す
    const keep = [...new Set([...imagesOf(input), ...imagesOf(post.submittedContent)])]
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    await db.batch([
      db.update(blogPosts).set(input).where(eq(blogPosts.id, post.id)),
      db
        .delete(blogImages)
        .where(
          and(
            eq(blogImages.postId, post.id),
            lt(blogImages.createdAt, recent),
            ...(keep.length ? [notInArray(blogImages.fileName, keep)] : []),
          ),
        ),
    ])
    return c.json({ ok: true })
  })

  .delete('/posts/:id', async (c) => {
    const db = createDb(c.env)
    const post = await findPost(db, c.req.param('id'))
    assertCanManage(c.get('session'), post.authorId)
    if (post.publishedAt) throw badRequest('公開済みの記事は削除できません')
    if (post.status === 'in_review') throw badRequest('レビュー中の記事は削除できません。先にPRをクローズしてください')
    await db.delete(blogPosts).where(eq(blogPosts.id, post.id))
    return c.json({ ok: true })
  })

  // --- 画像 ----------------------------------------------------------------

  .post('/posts/:id/images', async (c) => {
    const db = createDb(c.env)
    const post = await findPost(db, c.req.param('id'))
    assertCanManage(c.get('session'), post.authorId)

    const bytes = new Uint8Array(await c.req.arrayBuffer())
    if (bytes.length === 0 || !isWebp(bytes)) throw badRequest('WebP画像を送信してください')
    if (bytes.length > MAX_IMAGE_BYTES) throw badRequest('画像サイズが大きすぎます')

    const fileName = newImageFileName()
    await db.insert(blogImages).values({ postId: post.id, fileName, data: bytesToBase64(bytes), size: bytes.length })
    return c.json({ fileName }, 201)
  })

  .get('/posts/:id/images/:fileName', async (c) => {
    const { id, fileName } = c.req.param()
    if (!IMAGE_FILE_PATTERN.test(fileName)) throw notFound('画像が見つかりません')
    const image = await createDb(c.env)
      .select({ data: blogImages.data })
      .from(blogImages)
      .where(and(eq(blogImages.postId, id), eq(blogImages.fileName, fileName)))
      .get()
    if (!image) throw notFound('画像が見つかりません')
    return c.body(base64ToBytes(image.data), 200, {
      'Content-Type': 'image/webp',
      // ファイル名ごとに中身は不変
      'Cache-Control': 'private, max-age=31536000, immutable',
    })
  })

  // --- 提出（PR作成・更新） ---------------------------------------------------

  .post('/posts/:id/submit', async (c) => {
    if (!isGitHubConfigured(c.env)) throw new HTTPException(503, { message: 'GitHub連携が設定されていません' })

    const db = createDb(c.env)
    const post = await findPost(db, c.req.param('id'))
    assertCanManage(c.get('session'), post.authorId)

    const content = contentOf(post)
    const errors = validateForSubmit(content)
    if (errors.length > 0) throw badRequest(errors.join('\n'))

    const articleId = buildArticleId(content.eventDate, content.slug)
    if (post.publishedAt && articleId !== post.articleId) throw badRequest('公開済みの記事は日付と記事IDを変更できません')
    const duplicate = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(eq(blogPosts.articleId, articleId), ne(blogPosts.id, post.id), ne(blogPosts.status, 'draft')))
      .get()
    if (duplicate) throw conflict('同じ記事IDの記事がダッシュボードで提出されています。記事IDを変更してください')

    const images = referencedImages(content)
    const uploaded = images.length
      ? await db
          .select({ fileName: blogImages.fileName })
          .from(blogImages)
          .where(and(eq(blogImages.postId, post.id), inArray(blogImages.fileName, images)))
      : []
    const missing = images.filter((name) => !uploaded.some((image) => image.fileName === name))
    if (missing.length > 0) throw badRequest(`画像が見つかりません。アップロードし直してください: ${missing.join(', ')}`)

    try {
      const publisher = await BlogPublisher.create(c.env, db)
      if (!post.publishedAt && (await publisher.articleExists(articleId))) {
        throw conflict('同じ記事IDの記事がすでにサイトにあります。記事IDを変更してください')
      }
      const authorLabel = await authorLabelOf(db, post.authorId)
      const result = await publisher.sync({ id: post.id, prNumber: post.prNumber, submittedContent: content, authorLabel })

      await db
        .update(blogPosts)
        .set({
          status: 'in_review',
          submittedContent: content,
          submittedAt: new Date().toISOString(),
          articleId,
          branch: result.branch,
          prNumber: result.prNumber,
          prUrl: result.prUrl,
        })
        .where(eq(blogPosts.id, post.id))

      runInBackground(
        c,
        notifySubmitted(
          c.env,
          { id: post.id, title: content.title, authorId: post.authorId, authorLabel, prUrl: result.prUrl },
          !result.created,
        ),
      )
      return c.json({ prUrl: result.prUrl, created: result.created })
    } catch (error) {
      if (error instanceof HTTPException) throw error
      console.error('ブログのPR作成に失敗しました', error)
      throw new HTTPException(502, { message: 'GitHubへの反映に失敗しました。時間をおいて再度お試しください' })
    }
  })
