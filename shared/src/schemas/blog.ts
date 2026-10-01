import { z } from 'zod'
import { BLOG_SERIES_IDS, IMAGE_FILE_PATTERN, type BlogPostContent } from '../blog'

export const TAG_LABEL_MAX = 30

/** 下書き保存用。提出時のチェックは validateForSubmit で行う */
export const blogPostInputSchema = z.object({
  title: z.string().max(100, 'タイトルが長すぎます'),
  eventDate: z.union([z.literal(''), z.iso.date()]),
  series: z.union([z.literal(''), z.enum(BLOG_SERIES_IDS)]),
  description: z.string().max(300, '説明文が長すぎます'),
  authorName: z.string().max(50),
  tags: z.array(z.string().min(1).max(TAG_LABEL_MAX)),
  thumbnail: z.string().regex(IMAGE_FILE_PATTERN).nullable(),
  body: z.string().max(50_000, '本文が長すぎます'),
}) satisfies z.ZodType<BlogPostContent>

/** タグの追加・名前の変更（管理者） */
export const blogTagInputSchema = z.object({
  label: z.string().trim().min(1, 'タグ名を入力してください').max(TAG_LABEL_MAX, 'タグ名が長すぎます'),
})

/** アップロード画像の上限（クライアント側でWebP・最大1600pxに変換してから送る） */
export const MAX_IMAGE_BYTES = 1_500_000
