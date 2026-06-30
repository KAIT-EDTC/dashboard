import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import { blogPosts } from '../db/schema'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppEnv>()

const blogRoute = app
  .use('/*', authMiddleware)

  // List user's blog posts
  .get('/list', async (c) => {
    const user = c.get('user')
    const db = drizzle(c.env.DB)
    const posts = await db.select().from(blogPosts)
      .where(eq(blogPosts.authorId, user.id))
      .orderBy(desc(blogPosts.createdAt))
      .all()
    return c.json({ posts })
  })

  // Create a new blog post (draft)
  .post('/create', async (c) => {
    const user = c.get('user')
    const body = await c.req.json<{
      title: string
      content: string
      eventName: string
      eventDate: string
    }>()

    if (!body.title || !body.content || !body.eventName || !body.eventDate) {
      return c.json({ error: '全ての項目を入力してください' }, 400)
    }

    // Validate eventDate format mm-dd
    if (!/^\d{2}-\d{2}$/.test(body.eventDate)) {
      return c.json({ error: 'イベント日付はmm-dd形式で入力してください' }, 400)
    }

    const db = drizzle(c.env.DB)
    const id = crypto.randomUUID()

    await db.insert(blogPosts).values({
      id,
      authorId: user.id,
      title: body.title,
      content: body.content,
      eventName: body.eventName,
      eventDate: body.eventDate,
    })

    return c.json({ id }, 201)
  })

  // Update a blog post
  .put('/update/:id', async (c) => {
    const user = c.get('user')
    const postId = c.req.param('id')
    const body = await c.req.json<{
      title?: string
      content?: string
      eventName?: string
      eventDate?: string
    }>()

    const db = drizzle(c.env.DB)
    const post = await db.select().from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .get()

    if (!post || post.authorId !== user.id) {
      return c.json({ error: 'ブログが見つかりません' }, 404)
    }

    await db.update(blogPosts)
      .set({
        ...(body.title && { title: body.title }),
        ...(body.content && { content: body.content }),
        ...(body.eventName && { eventName: body.eventName }),
        ...(body.eventDate && { eventDate: body.eventDate }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(blogPosts.id, postId))

    return c.json({ success: true })
  })

  // Publish a blog post (create GitHub PR)
  .post('/publish/:id', async (c) => {
    const user = c.get('user')
    const postId = c.req.param('id')

    const db = drizzle(c.env.DB)
    const post = await db.select().from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .get()

    if (!post || post.authorId !== user.id) {
      return c.json({ error: 'ブログが見つかりません' }, 404)
    }

    if (post.status === 'published') {
      return c.json({ error: 'すでに公開済みです', prUrl: post.githubPrUrl }, 400)
    }

    const REPO = 'KAIT-EDTC/EDTCHP'
    const branchName = `blog/${post.eventName}-${post.eventDate}`
    const GITHUB_TOKEN = c.env.GITHUB_TOKEN
    const headers = {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }

    try {
      // 1. Get default branch SHA
      const repoRes = await fetch(`https://api.github.com/repos/${REPO}`, {
        headers: { ...headers, 'User-Agent': 'EDTC-Dashboard' },
      })
      const repoData = await repoRes.json() as { default_branch: string }
      const defaultBranch = repoData.default_branch

      const refRes = await fetch(`https://api.github.com/repos/${REPO}/git/ref/heads/${defaultBranch}`, {
        headers: { ...headers, 'User-Agent': 'EDTC-Dashboard' },
      })
      const refData = await refRes.json() as { object: { sha: string } }
      const baseSha = refData.object.sha

      // 2. Create branch
      await fetch(`https://api.github.com/repos/${REPO}/git/refs`, {
        method: 'POST',
        headers: { ...headers, 'User-Agent': 'EDTC-Dashboard' },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      })

      // 3. Create/update file in the branch
      const filePath = `public/blog/contents/${post.eventName}-${post.eventDate}.md`
      const fileContent = `---\ntitle: "${post.title}"\ndate: "${new Date().toISOString().split('T')[0]}"\nauthor: "${user.username}"\nevent: "${post.eventName}"\n---\n\n${post.content}`
      const encoded = btoa(unescape(encodeURIComponent(fileContent)))

      await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: { ...headers, 'User-Agent': 'EDTC-Dashboard' },
        body: JSON.stringify({
          message: `blog: ${post.title}`,
          content: encoded,
          branch: branchName,
        }),
      })

      // 4. Create PR
      const prRes = await fetch(`https://api.github.com/repos/${REPO}/pulls`, {
        method: 'POST',
        headers: { ...headers, 'User-Agent': 'EDTC-Dashboard' },
        body: JSON.stringify({
          title: `[Blog] ${post.title}`,
          body: `## ブログ記事\n\n- イベント: ${post.eventName}\n- 日付: ${post.eventDate}\n- 作成者: ${user.username}`,
          head: branchName,
          base: defaultBranch,
        }),
      })
      const prData = await prRes.json() as { html_url: string }

      // 5. Update post status
      await db.update(blogPosts)
        .set({
          status: 'published',
          githubPrUrl: prData.html_url,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(blogPosts.id, postId))

      return c.json({ prUrl: prData.html_url })
    } catch (error) {
      console.error('GitHub PR作成エラー:', error)
      return c.json({ error: 'PRの作成に失敗しました' }, 500)
    }
  })

export default blogRoute
