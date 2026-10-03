import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { DISCORD_WEBHOOK_URL_PATTERN, NOTIFICATION_KIND_IDS } from '../notifications'

export const userRoleSchema = z.object({ role: z.enum(['member', 'admin']) })

/** ブログ提出時にメンションするレビュー担当（Discord user ID の一覧。順序・重複は無視される） */
export const blogReviewersSchema = z.object({
  userIds: z.array(z.string().min(1)).max(50, 'レビュー担当が多すぎます'),
})

/**
 * 通知設定の保存。webhookUrl は、文字列なら更新、null なら削除（環境変数の値に戻る）、未指定なら変更しない
 */
export const notificationSettingsSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .regex(DISCORD_WEBHOOK_URL_PATTERN, 'DiscordのWebhook URL（https://discord.com/api/webhooks/…）を入力してください')
    .nullable()
    .optional(),
  enabled: z.record(z.enum(NOTIFICATION_KIND_IDS), z.boolean()),
})

const userIds = z.array(z.string().min(1)).max(50)

/**
 * 役職（活動報告書の承認者）。送られた内容で全員分を置き換える。
 * 代表・本部長はどちらか一方だけ（同じ人を両方には指定できない）
 */
export const positionsSchema = z
  .object({
    representatives: userIds,
    generalManagers: userIds,
    divisionHeads: z.partialRecord(z.enum(DIVISIONS), userIds),
  })
  .refine((v) => !v.representatives.some((id) => v.generalManagers.includes(id)), {
    path: ['generalManagers'],
    message: '同じ人を代表と本部長の両方には指定できません',
  })
export type PositionsInput = z.input<typeof positionsSchema>
