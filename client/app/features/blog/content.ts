import type { BlogPostContent } from '@edtc/shared'

/** APIの記事データから編集対象の部分だけを取り出す（キー順はサーバーと同じ） */
export function contentOf(post: BlogPostContent): BlogPostContent {
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
