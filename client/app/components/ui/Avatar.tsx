import { useState } from 'react'
import { css } from 'styled-system/css'
import { avatarUrl } from '~/lib/discord'

type AvatarUser = { id: string; discordAvatar: string | null; lastName?: string; discordUsername: string }

export function Avatar({ user, size = 32 }: { user: AvatarUser; size?: number }) {
  const [failed, setFailed] = useState(false)
  const src = avatarUrl(user, size <= 64 ? 64 : 256)
  const initial = (user.lastName || user.discordUsername).charAt(0).toUpperCase()

  return src && !failed ? (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={css({ borderRadius: 'full', objectFit: 'cover', flexShrink: 0, bg: 'surface.muted' })}
    />
  ) : (
    <span
      aria-hidden="true"
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderRadius: 'full',
        bg: 'discord',
        color: 'fg.inverted',
        fontWeight: '700',
      })}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  )
}
