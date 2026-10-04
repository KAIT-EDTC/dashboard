import { z } from 'zod'
import { DISCORD_WEBHOOK_URL_PATTERN, NOTIFICATION_KIND_IDS } from '../notifications'

export const userRoleSchema = z.object({ role: z.enum(['member', 'admin']) })

/** ブログ提出時にメンションするレビュー担当（Discord user ID の一覧。順序・重複は無視される） */
export const blogReviewersSchema = z.object({
  userIds: z.array(z.string().min(1)).max(50, 'レビュー担当が多すぎます'),
})

/**
 * 通知設定の保存。webhookUrl は、文字列なら更新、null なら削除（環境変数の値に戻る）、未指定なら変更しない。
 * enabled（通知の種類）も未指定なら変更しない。通知先と種類はそれぞれ単独で保存できる
 */
export const notificationSettingsSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .regex(DISCORD_WEBHOOK_URL_PATTERN, 'DiscordのWebhook URL（https://discord.com/api/webhooks/…）を入力してください')
    .nullable()
    .optional(),
  enabled: z.record(z.enum(NOTIFICATION_KIND_IDS), z.boolean()).optional(),
})
