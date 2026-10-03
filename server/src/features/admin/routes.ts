import { eq, inArray, isNotNull, ne, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { blogReviewersSchema, notificationSettingsSchema, positionsSchema, userRoleSchema, type Division, type Officer } from '@edtc/shared'
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

  // 役職（部署長・本部長・代表）。活動報告書の承認者になる。送られた内容で全員分を置き換える
  .put('/positions', validate('json', positionsSchema), async (c) => {
    const { representatives, generalManagers, divisionHeads } = c.req.valid('json')
    const next = new Map<string, { officer: Officer | null; headOf: Division[] }>()
    const entry = (id: string) => next.get(id) ?? next.set(id, { officer: null, headOf: [] }).get(id)!
    for (const id of representatives) entry(id).officer = 'representative'
    for (const id of generalManagers) entry(id).officer = 'general_manager'
    for (const [division, ids] of Object.entries(divisionHeads) as [Division, string[]][]) {
      for (const id of ids) entry(id).headOf.push(division)
    }

    const db = createDb(c.env)
    const ids = [...next.keys()]
    if (ids.length > 0) {
      const found = await db.select({ id: users.id }).from(users).where(inArray(users.id, ids))
      if (found.length !== ids.length) throw badRequest('メンバーが見つかりません。画面を読み込み直してください')
    }
    await db.batch([
      // いったん全員の役職を外してから、指定された人に付け直す
      db.update(users).set({ officer: null, headOf: [] }).where(or(isNotNull(users.officer), ne(users.headOf, []))),
      ...[...next].map(([id, position]) => db.update(users).set(position).where(eq(users.id, id))),
    ])
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
