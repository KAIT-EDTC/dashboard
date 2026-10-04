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
} as const satisfies Record<NotificationKind, keyof typeof notificationSettings.$inferSelect>

export type NotificationSettings = {
  /** 画面で保存したWebhook URL（なければ null） */
  webhookUrl: string | null
  enabled: Record<NotificationKind, boolean>
}

/** 保存された通知設定。行が無ければ「通知先なし・すべてオン」 */
export async function getNotificationSettings(db: Db): Promise<NotificationSettings> {
  const row = await db.select().from(notificationSettings).where(eq(notificationSettings.id, SETTINGS_ID)).get()
  const enabled = Object.fromEntries(
    Object.entries(ENABLED_COLUMNS).map(([kind, column]) => [kind, row ? row[column] : true]),
  ) as Record<NotificationKind, boolean>
  return { webhookUrl: row?.webhookUrl ?? null, enabled }
}

/** 通知の送り先。画面で保存した値を優先し、無ければ環境変数（移行用）を使う */
export function resolveWebhook(env: Pick<Bindings, 'DISCORD_WEBHOOK_URL'>, settings: NotificationSettings) {
  if (settings.webhookUrl) return { url: settings.webhookUrl, source: 'db' as const }
  if (env.DISCORD_WEBHOOK_URL) return { url: env.DISCORD_WEBHOOK_URL, source: 'env' as const }
  return { url: null, source: null }
}

/** 画面に見せるための、URLの末尾だけ（URLを知っていれば誰でもそのチャンネルに投稿できるため全体は返さない） */
export const webhookHint = (url: string) => `…${url.slice(-6)}`

export async function saveNotificationSettings(
  db: Db,
  input: { webhookUrl?: string | null; enabled?: Record<NotificationKind, boolean> },
) {
  const { enabled } = input
  const enabledColumns = enabled
    ? Object.fromEntries(Object.entries(ENABLED_COLUMNS).map(([kind, column]) => [column, enabled[kind as NotificationKind]]))
    : {}
  const values = { ...enabledColumns, ...(input.webhookUrl !== undefined && { webhookUrl: input.webhookUrl }) }
  await db
    .insert(notificationSettings)
    .values({ id: SETTINGS_ID, ...values })
    .onConflictDoUpdate({ target: notificationSettings.id, set: { ...values, updatedAt: new Date().toISOString() } })
}
