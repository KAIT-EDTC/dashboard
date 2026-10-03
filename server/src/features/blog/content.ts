import { referencedImages, type BlogPostContent } from '@edtc/shared'
import type { blogPosts } from '../../db/schema'

type PostRow = typeof blogPosts.$inferSelect

/** DBの行から記事の中身だけを取り出す（キー順を固定して比較できるようにする） */
export function contentOf(post: Pick<PostRow, keyof BlogPostContent>): BlogPostContent {
  return {
    title: post.title,
    eventDate: post.eventDate,
    series: post.series,
    description: post.description,
    authorName: post.authorName,
    tags: post.tags,
    thumbnail: post.thumbnail,
    body: post.body,
  }
}

export function imagesOf(content: BlogPostContent | null | undefined): string[] {
  return content ? referencedImages(content) : []
}

/** 旧ルールで提出した内容（series がなく slug がある）を今の形に揃える */
export function normalizeSnapshot(snapshot: BlogPostContent): BlogPostContent {
  const { slug: _legacySlug, ...rest } = snapshot as BlogPostContent & { slug?: string }
  return contentOf({ ...rest, series: rest.series ?? '' })
}

export function hasUnsubmittedChanges(post: PostRow): boolean {
  return !!post.submittedContent && JSON.stringify(contentOf(post)) !== JSON.stringify(normalizeSnapshot(post.submittedContent))
}
