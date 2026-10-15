import { eq } from 'drizzle-orm'
import type { NotificationKind } from '@edtc/shared'
import type { Db } from '../../db'
import { notificationSettings } from '../../db/schema'
import type { Bindings } from '../../env'

const SETTINGS_ID = 1

const ENABLED_COLUMNS = {
  eventCreated: 'onEventCreated',
  blogSubmitted: 'onBlogSubmitted',
  blogPublished: 'onBlogPublished',
  blogClosed: 'onBlogClosed',
  blogFeedback: 'onBlogFeedback',
  reportReviewRequested: 'onReportReviewRequested',
  reportReviewed: 'onReportReviewed',
} as const satisfies Record<NotificationKind, keyof typeof notificationSettings.$inferSelect>

export type NotificationSettings = {
  enabled: Record<NotificationKind, boolean>
}

/** 保存された通知設定。行が無ければ「すべてオン」 */
export async function getNotificationSettings(db: Db): Promise<NotificationSettings> {
  const row = await db.select().from(notificationSettings).where(eq(notificationSettings.id, SETTINGS_ID)).get()
  const enabled = Object.fromEntries(
    Object.entries(ENABLED_COLUMNS).map(([kind, column]) => [kind, row ? row[column] : true]),
  ) as Record<NotificationKind, boolean>
  return { enabled }
}

/** 通知の送り先（環境変数で設定する）。イベントとブログで別のチャンネルに送る */
export type WebhookTarget = 'event' | 'blog'

export const WEBHOOK_ENV_NAMES = {
  event: 'DISCORD_EVENT_WEBHOOK_URL',
  blog: 'DISCORD_BLOG_WEBHOOK_URL',
} as const satisfies Record<WebhookTarget, keyof Bindings>

/** 通知の種類ごとの送り先。イベント以外（ブログ関連）はブログ用 */
export const webhookTargetOf = (kind: NotificationKind): WebhookTarget => (kind === 'eventCreated' ? 'event' : 'blog')

/** 送り先のWebhook URL。未設定なら null */
export const resolveWebhook = (env: Bindings, target: WebhookTarget) => env[WEBHOOK_ENV_NAMES[target]] || null

/** 画面に見せるための、URLの末尾だけ（URLを知っていれば誰でもそのチャンネルに投稿できるため全体は返さない） */
export const webhookHint = (url: string) => `…${url.slice(-6)}`

export async function saveNotificationSettings(
  db: Db,
  input: { enabled: Record<NotificationKind, boolean> },
) {
  const values = Object.fromEntries(Object.entries(ENABLED_COLUMNS).map(([kind, column]) => [column, input.enabled[kind as NotificationKind]]))
  await db
    .insert(notificationSettings)
    .values({ id: SETTINGS_ID, ...values })
    .onConflictDoUpdate({ target: notificationSettings.id, set: { ...values, updatedAt: new Date().toISOString() } })
}
