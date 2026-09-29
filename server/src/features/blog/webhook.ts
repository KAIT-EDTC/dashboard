import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { createDb, type Db } from '../../db'
import { blogPosts } from '../../db/schema'
import type { AppEnv } from '../../env'
import { runInBackground } from '../../lib/background'
import { verifyWebhookSignature } from '../../lib/github'
import { notifyClosed, notifyFeedback, notifyPublished } from './notifications'
import { BlogPublisher } from './publisher'
import { authorLabelOf } from './queries'

/**
 * GitHub App の Webhook。記事PRの状態をダッシュボードに反映し、執筆者にDiscordで知らせる。
 * 購読するイベント: Pull request / Pull request review / Issue comment
 */

type GitHubUser = { login: string; type: string }
type PullRequestPayload = {
  action: string
  repository: { full_name: string }
  pull_request: { number: number; merged: boolean; html_url: string }
}
type ReviewPayload = {
  action: string
  repository: { full_name: string }
  pull_request: { number: number }
  review: { state: string; body: string | null; html_url: string; user: GitHubUser }
}
type IssueCommentPayload = {
  action: string
  repository: { full_name: string }
  issue: { number: number; pull_request?: unknown }
  comment: { body: string; html_url: string; user: GitHubUser }
}

async function findPostByPr(db: Db, prNumber: number) {
  return db.select().from(blogPosts).where(eq(blogPosts.prNumber, prNumber)).get()
}

async function summaryOf(db: Db, post: typeof blogPosts.$inferSelect) {
  return {
    id: post.id,
    title: post.submittedContent?.title ?? post.title,
    authorId: post.authorId,
    authorLabel: await authorLabelOf(db, post.authorId),
    prUrl: post.prUrl ?? '',
  }
}

export const githubWebhookRoute = new Hono<AppEnv>().post('/', async (c) => {
  const secret = c.env.GITHUB_WEBHOOK_SECRET
  if (!secret) return c.json({ error: 'Webhook is not configured' }, 503)

  const body = await c.req.text()
  if (!(await verifyWebhookSignature(secret, body, c.req.header('X-Hub-Signature-256')))) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const payload = JSON.parse(body) as { repository?: { full_name: string } }
  if (payload.repository?.full_name.toLowerCase() !== c.env.BLOG_REPO.toLowerCase()) {
    return c.json({ ok: true })
  }

  const db = createDb(c.env)
  const event = c.req.header('X-GitHub-Event')

  if (event === 'pull_request') {
    const { action, pull_request: pr } = payload as PullRequestPayload
    if (action !== 'closed') return c.json({ ok: true })
    const post = await findPostByPr(db, pr.number)
    if (!post) return c.json({ ok: true })

    const summary = await summaryOf(db, post)
    if (pr.merged) {
      await db
        .update(blogPosts)
        .set({ status: 'published', publishedAt: new Date().toISOString() })
        .where(eq(blogPosts.id, post.id))
      runInBackground(c, notifyPublished(c.env, summary, post.articleId))
      if (post.branch) {
        const branch = post.branch
        runInBackground(c, BlogPublisher.create(c.env, db).then((publisher) => publisher.deleteBranch(branch)))
      }
    } else {
      // 公開済み記事の修正PRが閉じられた場合は公開済みに戻す
      await db
        .update(blogPosts)
        .set({ status: post.publishedAt ? 'published' : 'draft' })
        .where(eq(blogPosts.id, post.id))
      runInBackground(c, notifyClosed(c.env, summary))
    }
    return c.json({ ok: true })
  }

  if (event === 'pull_request_review') {
    const { action, pull_request: pr, review } = payload as ReviewPayload
    if (action !== 'submitted' || review.user.type === 'Bot') return c.json({ ok: true })
    const kind = review.state.toLowerCase()
    if (kind !== 'approved' && kind !== 'changes_requested' && kind !== 'commented') return c.json({ ok: true })
    // 本文のないコメントレビューは行コメントのみなので、個別の通知は送らない
    if (kind === 'commented' && !review.body?.trim()) return c.json({ ok: true })

    const post = await findPostByPr(db, pr.number)
    if (post) {
      runInBackground(
        c,
        notifyFeedback(c.env, await summaryOf(db, post), {
          kind,
          reviewer: review.user.login,
          body: review.body ?? '',
          url: review.html_url,
        }),
      )
    }
    return c.json({ ok: true })
  }

  if (event === 'issue_comment') {
    const { action, issue, comment } = payload as IssueCommentPayload
    if (action !== 'created' || !issue.pull_request || comment.user.type === 'Bot') return c.json({ ok: true })
    const post = await findPostByPr(db, issue.number)
    if (post) {
      runInBackground(
        c,
        notifyFeedback(c.env, await summaryOf(db, post), {
          kind: 'commented',
          reviewer: comment.user.login,
          body: comment.body,
          url: comment.html_url,
        }),
      )
    }
    return c.json({ ok: true })
  }

  return c.json({ ok: true })
})
