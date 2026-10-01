import { and, eq, ne } from 'drizzle-orm'
import { articleIdBase, isArticleIdOf, type BlogPostContent } from '@edtc/shared'
import type { Db } from '../../db'
import { blogPosts } from '../../db/schema'
import { badRequest } from '../../lib/errors'
import type { BlogPublisher } from './publisher'

/**
 * 提出する記事の記事IDを決める。
 *
 * - 公開済みなら変わらない
 * - すでに今の日付・イベント種別に合うID（または旧ルールで提出済みのID）を持っていれば、そのまま使う
 * - それ以外は「YY-MM-DD-イベント種別」から始めて、使用済みなら -2, -3… と連番を付ける
 *   （使用済み = 他の提出済み記事のID、または EDTCHP にすでにあるフォルダ）
 */
export async function resolveArticleId(
  db: Db,
  publisher: BlogPublisher,
  post: { id: string; articleId: string | null; publishedAt: string | null },
  content: BlogPostContent,
): Promise<string> {
  if (post.publishedAt && post.articleId) return post.articleId

  const base = articleIdBase(content.eventDate, content.series)
  if (post.articleId && (!content.series || isArticleIdOf(post.articleId, base))) return post.articleId
  if (!base) throw badRequest('イベント実施日とイベント種別を入力してください')

  for (let n = 1; n <= 99; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const taken = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(eq(blogPosts.articleId, candidate), ne(blogPosts.id, post.id), ne(blogPosts.status, 'draft')))
      .get()
    if (!taken && !(await publisher.articleExists(candidate))) return candidate
  }
  throw badRequest('同じ日付・イベント種別の記事が多すぎます')
}
