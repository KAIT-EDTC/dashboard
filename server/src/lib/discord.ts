import { DIVISIONS, type Division, type Officer } from '@edtc/shared'
import type { Bindings } from '../env'

const API = 'https://discord.com/api/v10'

// ---------------------------------------------------------------------------
// OAuth2
// ---------------------------------------------------------------------------

/**
 * guilds.members.read で「自分のサーバー内プロフィール（ニックネーム・ロール）」を取得できるため、
 * Botトークンなしでサーバー所属・学籍番号・管理者ロールを確認できる
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
  roles: string[]
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

const roleIds = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

export function isAdminMember(env: Bindings, member: DiscordGuildMember): boolean {
  const adminRoles = roleIds(env.DISCORD_ADMIN_ROLE_IDS)
  return member.roles.some((role) => adminRoles.includes(role))
}

const officerRoleIds = (env: Bindings, officer: Officer) =>
  roleIds(officer === 'representative' ? env.DISCORD_REPRESENTATIVE_ROLE_IDS : env.DISCORD_GENERAL_MANAGER_ROLE_IDS)

/** 代表・本部長のロールを持っていればその役職（両方なら代表） */
export function officerOf(env: Bindings, member: DiscordGuildMember): Officer | null {
  if (officerRoleIds(env, 'representative').some((id) => member.roles.includes(id))) return 'representative'
  if (officerRoleIds(env, 'general_manager').some((id) => member.roles.includes(id))) return 'general_manager'
  return null
}

/** DISCORD_DIVISION_HEAD_ROLE_IDS（部署:ロールID をカンマ区切り）を読む。部署名の誤りは無視する */
function divisionHeadRoles(env: Bindings): Map<Division, string> {
  const map = new Map<Division, string>()
  for (const entry of (env.DISCORD_DIVISION_HEAD_ROLE_IDS ?? '').split(',')) {
    const [division, roleId] = entry.split(/[:：]/).map((v) => v.trim())
    if (roleId && (DIVISIONS as readonly string[]).includes(division)) map.set(division as Division, roleId)
  }
  return map
}

/** 部長ロールを持っている部署 */
export function headDivisionsOf(env: Bindings, member: DiscordGuildMember): Division[] {
  return [...divisionHeadRoles(env)].filter(([, roleId]) => member.roles.includes(roleId)).map(([division]) => division)
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
export const mentionRole = (roleId: string) => `<@&${roleId}>`

/** 通知の失敗で本来の処理を失敗させないよう、例外は握りつぶしてログだけ残す */
export async function notify(
  env: Bindings,
  message: { content?: string; embeds?: DiscordEmbed[]; mentionUserIds?: string[]; mentionRoleIds?: string[] },
): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) return
  try {
    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message.content,
        embeds: message.embeds,
        allowed_mentions: { users: message.mentionUserIds ?? [], roles: message.mentionRoleIds ?? [] },
      }),
    })
    if (!res.ok) console.error('Discord通知に失敗しました', res.status, await res.text())
  } catch (error) {
    console.error('Discord通知に失敗しました', error)
  }
}

// ---------------------------------------------------------------------------
// DM（Bot）。常駐はせず、送るときにREST APIを呼ぶだけ
// ---------------------------------------------------------------------------

/**
 * 1人にDMを送る。Botと同じサーバーにいて、サーバーメンバーからのDMを許可している人にだけ届く。
 * notify と同じく、失敗しても本来の処理は止めずログだけ残す
 */
export async function sendDirectMessage(
  env: Bindings,
  userId: string,
  message: { content: string; embeds?: DiscordEmbed[] },
): Promise<void> {
  if (!env.DISCORD_BOT_TOKEN) return
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
