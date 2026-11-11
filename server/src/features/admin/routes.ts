import { eq, inArray, isNotNull, ne, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { blogReviewersSchema, notificationSettingsSchema, notificationTestSchema, positionsSchema, userRoleSchema, type Division, type Officer } from '@edtc/shared'
import { createDb } from '../../db'
import { blogReviewers, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import { badRequest, notFound } from '../../lib/errors'
import { fetchGuildTextChannels, sendChannelMessage } from '../../lib/discord'
import { validate } from '../../lib/validator'
import { assertAdmin, requireAuth } from '../../middleware/auth'
import { getNotificationSettings, saveNotificationSettings } from './notification-settings'

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

  .get('/notifications', async (c) => {
    const settings = await getNotificationSettings(createDb(c.env))
    return c.json({ botConfigured: Boolean(c.env.DISCORD_BOT_TOKEN), channels: settings.channels, enabled: settings.enabled })
  })

  /** 通知先に選べるチャンネル。Botが未設定なら空 */
  .get('/notifications/channels', async (c) => {
    if (!c.env.DISCORD_BOT_TOKEN) return c.json({ channels: [] })
    const result = await fetchGuildTextChannels(c.env)
    if (!result.ok) {
      console.error('チャンネル一覧を取得できませんでした', result.error)
      throw badRequest('チャンネルの一覧を取得できませんでした。BotがEDTCのサーバーに参加しているか確認してください')
    }
    return c.json({ channels: result.channels })
  })

  .put('/notifications', validate('json', notificationSettingsSchema), async (c) => {
    const input = c.req.valid('json')
    // 他のサーバーのチャンネルに送らせないよう、このサーバーのチャンネルかを確認する
    const chosen = [input.eventChannelId, input.blogChannelId].filter((id): id is string => Boolean(id))
    if (chosen.length > 0) {
      const result = await fetchGuildTextChannels(c.env)
      if (!result.ok) throw badRequest('チャンネルを確認できませんでした。Botが設定されているか確認してください')
      if (!chosen.every((id) => result.channels.some((channel) => channel.id === id))) {
        throw badRequest('選んだチャンネルが見つかりません。画面を読み込み直してください')
      }
    }
    await saveNotificationSettings(createDb(c.env), input)
    return c.json({ ok: true })
  })

  /** 指定した送り先にテストメッセージを送る（通知の種類のオン/オフは見ない） */
  .post('/notifications/test', validate('json', notificationTestSchema), async (c) => {
    const { target } = c.req.valid('json')
    const channelId = (await getNotificationSettings(createDb(c.env))).channels[target]
    if (!channelId) throw badRequest('通知先のチャンネルが選ばれていません。先にチャンネルを選んでください')
    const result = await sendChannelMessage(c.env, channelId, { content: '✅ EDTCダッシュボードからのテスト通知です。この通知が見えていれば設定は正しく動いています。' })
    if (!result.ok) {
      console.error('テスト通知に失敗しました', result.error)
      throw badRequest('通知を送れませんでした。Botがそのチャンネルを見られるか、メッセージを送信できる権限があるか確認してください')
    }
    return c.json({ ok: true })
  })
