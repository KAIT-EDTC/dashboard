import { z } from 'zod'
import { BLOG_TAGS, IMAGE_FILE_PATTERN, type BlogPostContent } from '../blog'

/** 下書き保存用。提出時のチェックは validateForSubmit で行う */
export const blogPostInputSchema = z.object({
  title: z.string().max(100, 'タイトルが長すぎます'),
  eventDate: z.union([z.literal(''), z.iso.date()]),
  slug: z
    .string()
    .max(50, '記事IDが長すぎます')
    .regex(/^[A-Za-z0-9_]*$/, '記事IDは半角英数字と _ のみ使用できます'),
  description: z.string().max(300, '説明文が長すぎます'),
  authorName: z.string().max(50),
  tags: z.array(z.enum(BLOG_TAGS)),
  thumbnail: z.string().regex(IMAGE_FILE_PATTERN).nullable(),
  body: z.string().max(50_000, '本文が長すぎます'),
}) satisfies z.ZodType<BlogPostContent>

/** アップロード画像の上限（クライアント側でWebP・最大1600pxに変換してから送る） */
export const MAX_IMAGE_BYTES = 1_500_000
