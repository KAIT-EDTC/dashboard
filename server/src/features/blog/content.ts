import { referencedImages, type BlogPostContent } from '@edtc/shared'
import type { blogPosts } from '../../db/schema'

type PostRow = typeof blogPosts.$inferSelect

/** DBの行から記事の中身だけを取り出す（キー順を固定して比較できるようにする） */
export function contentOf(post: Pick<PostRow, keyof BlogPostContent>): BlogPostContent {
  return {
    title: post.title,
    eventDate: post.eventDate,
    slug: post.slug,
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

export function hasUnsubmittedChanges(post: PostRow): boolean {
  return !!post.submittedContent && JSON.stringify(contentOf(post)) !== JSON.stringify(post.submittedContent)
}
