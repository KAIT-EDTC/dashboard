import { eq } from 'drizzle-orm'
import type { NotificationKind } from '@edtc/shared'
import type { Db } from '../../db'
import { notificationSettings } from '../../db/schema'

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

/** 通知の送り先。イベントとブログで別のチャンネルに送る */
export type NotificationTarget = 'event' | 'blog'

const CHANNEL_COLUMNS = {
  event: 'eventChannelId',
  blog: 'blogChannelId',
} as const satisfies Record<NotificationTarget, keyof typeof notificationSettings.$inferSelect>

/** 通知の種類ごとの送り先。イベント以外（ブログ関連）はブログ用 */
export const targetOf = (kind: NotificationKind): NotificationTarget => (kind === 'eventCreated' ? 'event' : 'blog')

export type NotificationSettings = {
  enabled: Record<NotificationKind, boolean>
  /** 送り先のチャンネルID。未選択なら null */
  channels: Record<NotificationTarget, string | null>
}

/** 保存された通知設定。行が無ければ「すべてオン・送り先なし」 */
export async function getNotificationSettings(db: Db): Promise<NotificationSettings> {
  const row = await db.select().from(notificationSettings).where(eq(notificationSettings.id, SETTINGS_ID)).get()
  const enabled = Object.fromEntries(
    Object.entries(ENABLED_COLUMNS).map(([kind, column]) => [kind, row ? row[column] : true]),
  ) as Record<NotificationKind, boolean>
  const channels = {
    event: row?.[CHANNEL_COLUMNS.event] ?? null,
    blog: row?.[CHANNEL_COLUMNS.blog] ?? null,
  }
  return { enabled, channels }
}

/** 送られた項目だけ保存する（enabled は種類ごと、チャンネルは null で解除、undefined なら変更なし） */
export async function saveNotificationSettings(
  db: Db,
  input: { enabled?: Record<NotificationKind, boolean>; eventChannelId?: string | null; blogChannelId?: string | null },
) {
  const { enabled, eventChannelId, blogChannelId } = input
  const values = {
    ...Object.fromEntries(Object.entries(ENABLED_COLUMNS).map(([kind, column]) => [column, enabled?.[kind as NotificationKind]])),
    eventChannelId,
    blogChannelId,
  }
  await db
    .insert(notificationSettings)
    .values({ id: SETTINGS_ID, ...values })
    .onConflictDoUpdate({ target: notificationSettings.id, set: { ...values, updatedAt: new Date().toISOString() } })
}
