type DiscordIdentity = { id: string; discordAvatar: string | null }

export function avatarUrl(user: DiscordIdentity, size = 128): string | null {
  return user.discordAvatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.discordAvatar}.png?size=${size}` : null
}
