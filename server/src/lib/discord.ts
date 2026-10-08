import type { NotificationKind } from '@edtc/shared'
import type { Db } from '../db'
import type { Bindings } from '../env'
import { getNotificationSettings, resolveWebhook } from '../features/admin/notification-settings'

const API = 'https://discord.com/api/v10'

// ---------------------------------------------------------------------------
// OAuth2
// ---------------------------------------------------------------------------

/**
 * guilds.members.read で「自分のサーバー内プロフィール（ニックネーム・ロール）」を取得できるため、
 * Botトークンなしでサーバー所属・学籍番号を確認できる
 */
const SCOPES = ['identify', 'guilds.members.read']

export type DiscordUser = {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

export type DiscordGuildMember = {
  nick: string | null
}

export function authorizeUrl(env: Bindings, state: string): string {
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    prompt: 'none',
  })
  return `https://discord.com/oauth2/authorize?${params}`
}

export async function exchangeCode(env: Bindings, code: string): Promise<string> {
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
  })
  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

export async function fetchCurrentUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Discord /users/@me failed: ${res.status}`)
  return res.json()
}

/** サーバーに参加していなければ null */
export async function fetchGuildMember(accessToken: string, guildId: string): Promise<DiscordGuildMember | null> {
  const res = await fetch(`${API}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Discord guild member fetch failed: ${res.status}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// 通知（Webhook）
// ---------------------------------------------------------------------------

export type DiscordEmbed = {
  title: string
  url?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
}

export const EMBED_COLORS = {
  info: 0x3b82f6,
  success: 0x22c55e,
  warning: 0xf59e0b,
  danger: 0xef4444,
} as const

/** Discordのユーザーメンション */
export const mention = (userId: string) => `<@${userId}>`

export type NotificationMessage = {
  content?: string
  embeds?: DiscordEmbed[]
  mentionUserIds?: string[]
}

/** Webhookに1件送る。失敗したら理由を返す（例外は投げない） */
export async function sendWebhook(url: string, message: NotificationMessage): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message.content,
        embeds: message.embeds,
        allowed_mentions: { users: message.mentionUserIds ?? [] },
      }),
    })
    if (!res.ok) return { ok: false, error: `Discordが ${res.status} を返しました: ${await res.text()}` }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * 設定で有効な通知だけを、設定された通知先に送る。
 * 通知の失敗で本来の処理を失敗させないよう、例外は握りつぶしてログだけ残す
 */
export async function notify(env: Bindings, db: Db, kind: NotificationKind, message: NotificationMessage): Promise<void> {
  try {
    const settings = await getNotificationSettings(db)
    const { url } = resolveWebhook(env, settings)
    if (!url || !settings.enabled[kind]) return
    const result = await sendWebhook(url, message)
    if (!result.ok) console.error('Discord通知に失敗しました', kind, result.error)
  } catch (error) {
    console.error('Discord通知に失敗しました', kind, error)
  }
}

// ---------------------------------------------------------------------------
// DM（Bot）。常駐はせず、送るときにREST APIを呼ぶだけ
// ---------------------------------------------------------------------------

/** DiscordのID（数字だけの17〜20桁） */
const isSnowflake = (id: string) => /^\d{17,20}$/.test(id)

/**
 * 1人にDMを送る。Botと同じサーバーにいて、サーバーメンバーからのDMを許可している人にだけ届く。
 * notify と同じく、失敗しても本来の処理は止めずログだけ残す
 */
export async function sendDirectMessage(
  env: Bindings,
  userId: string,
  message: { content: string; embeds?: DiscordEmbed[] },
): Promise<void> {
  // DiscordのユーザーIDでない相手（開発用シードのダミーユーザーなど）には送らない
  if (!env.DISCORD_BOT_TOKEN || !isSnowflake(userId)) return
  const headers = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }
  try {
    const channelRes = await fetch(`${API}/users/@me/channels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient_id: userId }),
    })
    if (!channelRes.ok) {
      console.error('DMチャンネルを開けませんでした', userId, channelRes.status, await channelRes.text())
      return
    }
    const channel = (await channelRes.json()) as { id: string }
    const res = await fetch(`${API}/channels/${channel.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...message, allowed_mentions: { parse: [] } }),
    })
    if (!res.ok) console.error('DMを送れませんでした', userId, res.status, await res.text())
  } catch (error) {
    console.error('DMを送れませんでした', userId, error)
  }
}

/** 複数人に同じDMを送る（人数は承認者数人程度なので順番に送る） */
export async function sendDirectMessages(env: Bindings, userIds: string[], message: { content: string; embeds?: DiscordEmbed[] }) {
  for (const userId of new Set(userIds)) await sendDirectMessage(env, userId, message)
}
