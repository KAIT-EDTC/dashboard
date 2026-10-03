import { z } from 'zod'

export const userRoleSchema = z.object({ role: z.enum(['member', 'admin']) })

/** ブログ提出時にメンションするレビュー担当（Discord user ID の一覧。順序・重複は無視される） */
export const blogReviewersSchema = z.object({
  userIds: z.array(z.string().min(1)).max(50, 'レビュー担当が多すぎます'),
})
