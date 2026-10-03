import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { blogReviewersSchema, notificationSettingsSchema, userRoleSchema } from '@edtc/shared'
import { createDb } from '../../db'
import { blogReviewers, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, notFound } from '../../lib/errors'
import { sendWebhook } from '../../lib/discord'
import { validate } from '../../lib/validator'
import { assertAdmin, requireAuth } from '../../middleware/auth'
import { getNotificationSettings, resolveWebhook, saveNotificationSettings, webhookHint } from './notification-settings'

/** 管理者専用の設定（ユーザーの権限・通知のメンション先） */
export const adminRoute = new Hono<AppEnv>()
  .use(requireAuth)
  .use((c, next) => {
    assertAdmin(c.get('session'))
    return next()
  })

  .put('/users/:id/role', validate('json', userRoleSchema), async (c) => {
    const id = c.req.param('id')
    // 自分の権限は変えられない（管理者が0人になってログイン後に誰も操作できなくなるのを防ぐ）
    if (id === c.get('session').userId) throw badRequest('自分自身の権限は変更できません')
    const updated = await createDb(c.env)
      .update(users)
      .set({ role: c.req.valid('json').role })
      .where(eq(users.id, id))
      .returning({ id: users.id })
    if (updated.length === 0) throw notFound('メンバーが見つかりません')
    return c.json({ ok: true })
  })

  .get('/blog-reviewers', async (c) => {
    const rows = await createDb(c.env).select({ userId: blogReviewers.userId }).from(blogReviewers)
    return c.json({ userIds: rows.map((row) => row.userId) })
  })

  /** 送られた一覧に置き換える */
  .put('/blog-reviewers', validate('json', blogReviewersSchema), async (c) => {
    const userIds = [...new Set(c.req.valid('json').userIds)]
    const db = createDb(c.env)
    if (userIds.length > 0) {
      const found = await db.select({ id: users.id }).from(users).where(inArray(users.id, userIds))
      if (found.length !== userIds.length) throw badRequest('メンバーが見つかりません。画面を読み込み直してください')
    }
    await db.batch([
      db.delete(blogReviewers),
      ...(userIds.length > 0 ? [db.insert(blogReviewers).values(userIds.map((userId) => ({ userId })))] : []),
    ])
    return c.json({ ok: true })
  })

  // --- 通知設定 ---------------------------------------------------------------

  /** Webhook URL は返さない（知っていれば誰でも投稿できるため）。設定の有無・出どころ・末尾だけ返す */
  .get('/notifications', async (c) => {
    const settings = await getNotificationSettings(createDb(c.env))
    const webhook = resolveWebhook(c.env, settings)
    return c.json({
      webhook: { source: webhook.source, hint: webhook.url ? webhookHint(webhook.url) : null },
      enabled: settings.enabled,
    })
  })

  .put('/notifications', validate('json', notificationSettingsSchema), async (c) => {
    await saveNotificationSettings(createDb(c.env), c.req.valid('json'))
    return c.json({ ok: true })
  })

  /** 今の通知先にテストメッセージを送る（通知の種類のオン/オフは見ない） */
  .post('/notifications/test', async (c) => {
    const { url } = resolveWebhook(c.env, await getNotificationSettings(createDb(c.env)))
    if (!url) throw badRequest('通知先が設定されていません')
    const result = await sendWebhook(url, { content: '✅ EDTCダッシュボードからのテスト通知です。この通知が見えていれば設定は正しく動いています。' })
    if (!result.ok) {
      console.error('テスト通知に失敗しました', result.error)
      throw badRequest('通知を送れませんでした。Webhook URLが正しいか、削除されていないか確認してください')
    }
    return c.json({ ok: true })
  })
