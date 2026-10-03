import { asc, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { blogPosts, blogReviewers, blogSeries, users } from '../../db/schema'
import type { Session } from '../../env'
import { notFound } from '../../lib/errors'
import { canManage } from '../../middleware/auth'

export async function findPost(db: Db, id: string) {
  const post = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).get()
  if (!post) throw notFound('記事が見つかりません')
  return post
}

/** 下書きは本人と管理者だけが見られる */
export function assertCanView(session: Session, post: { authorId: string; status: string }) {
  if (post.status === 'draft' && !canManage(session, post.authorId)) throw notFound('記事が見つかりません')
}

/** PR本文や通知に使う執筆者表記 */
export async function authorLabelOf(db: Db, userId: string) {
  const user = await db
    .select({ lastName: users.lastName, firstName: users.firstName, discordUsername: users.discordUsername })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return user ? `${user.lastName} ${user.firstName} (@${user.discordUsername})` : userId
}

/** 提出通知でメンションするレビュー担当（管理者が「ユーザー管理」で選ぶ） */
export async function listReviewerIds(db: Db) {
  const rows = await db.select({ userId: blogReviewers.userId }).from(blogReviewers)
  return rows.map((row) => row.userId)
}

/** 今あるイベント種別（並び順どおり） */
export function listSeries(db: Db) {
  return db
    .select({ id: blogSeries.id, label: blogSeries.label })
    .from(blogSeries)
    .orderBy(asc(blogSeries.sortOrder), asc(blogSeries.createdAt))
}
