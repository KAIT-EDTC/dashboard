import type { AppEnv } from '../types'

export type DiscordUser = {
  id: string
  username: string
  avatar: string | null
  global_name: string | null
}

export type DiscordGuild = {
  id: string
  name: string
}

export type DiscordGuildMember = {
  nick: string | null
  user: DiscordUser
}

export async function exchangeCode(code: string, env: AppEnv['Bindings']): Promise<{ access_token: string }> {
  const res = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Token exchange failed: ${error}`)
  }
  return res.json() as Promise<{ access_token: string }>
}

export async function getUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json() as Promise<DiscordUser>
}

export async function getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch guilds')
  return res.json() as Promise<DiscordGuild[]>
}

export async function getGuildMember(guildId: string, userId: string, botToken: string): Promise<DiscordGuildMember> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch guild member')
  return res.json() as Promise<DiscordGuildMember>
}
