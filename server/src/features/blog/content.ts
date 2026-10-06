import { isBlogSeriesId, referencedImages, type BlogPostContent } from '@edtc/shared'
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
    pickup: post.pickup,
    thumbnail: post.thumbnail,
    body: post.body,
  }
}

export function imagesOf(content: BlogPostContent | null | undefined): string[] {
  return content ? referencedImages(content) : []
}

type LegacySnapshot = Omit<BlogPostContent, 'series' | 'pickup'> & { series?: string; pickup?: boolean; slug?: string; tags?: string[] }

/**
 * 古い形式で提出した内容を今の形に揃える。
 * - series がなく slug がある（最初の形式）
 * - タグとイベント種別が別だった形式（tags があり pickup がない。種別 outreach は学外イベントに、event / other は未選択に）
 */
export function normalizeSnapshot(snapshot: BlogPostContent): BlogPostContent {
  const { slug: _legacySlug, tags, series = '', pickup, ...rest } = snapshot as LegacySnapshot
  const migrated = series === 'outreach' ? 'offcampus' : series
  return contentOf({
    ...rest,
    series: isBlogSeriesId(migrated) ? migrated : '',
    pickup: pickup ?? !!tags?.includes('ピックアップ'),
  })
}

export function hasUnsubmittedChanges(post: PostRow): boolean {
  return !!post.submittedContent && JSON.stringify(contentOf(post)) !== JSON.stringify(normalizeSnapshot(post.submittedContent))
}
