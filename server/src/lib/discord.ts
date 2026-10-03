import type { Bindings } from '../env'

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

/** 通知の失敗で本来の処理を失敗させないよう、例外は握りつぶしてログだけ残す */
export async function notify(
  env: Bindings,
  message: { content?: string; embeds?: DiscordEmbed[]; mentionUserIds?: string[] },
): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) return
  try {
    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message.content,
        embeds: message.embeds,
        allowed_mentions: { users: message.mentionUserIds ?? [] },
      }),
    })
    if (!res.ok) console.error('Discord通知に失敗しました', res.status, await res.text())
  } catch (error) {
    console.error('Discord通知に失敗しました', error)
  }
}
