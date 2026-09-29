import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { fullName } from '~/lib/format'
import { MemberBadges } from './MemberBadges'
import type { MemberListItem } from './types'

export function MemberCard({ member }: { member: MemberListItem }) {
  return (
    <Link
      to={`/members/${member.id}`}
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: 'sm',
        p: 'md',
        color: 'fg',
        bg: 'surface',
        borderWidth: '1px',
        borderColor: 'border',
        borderRadius: 'lg',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        _hover: { color: 'fg', borderColor: 'border.strong', shadow: 'card' },
      })}
    >
      <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
        <Avatar user={member} size={44} />
        <div className={css({ minW: 0 })}>
          <p className={css({ fontWeight: '600', truncate: true })}>
            {fullName(member)}
            {member.nickname && <span className={css({ ml: 'xs', fontSize: 'sm', color: 'fg.muted' })}>（{member.nickname}）</span>}
          </p>
          <p className={css({ fontSize: 'xs', color: 'fg.subtle', truncate: true })}>{member.department}</p>
        </div>
      </div>
      <MemberBadges member={member} />
      {member.headline && <p className={css({ fontSize: 'sm', color: 'fg.muted', lineClamp: 2 })}>{member.headline}</p>}
      {member.interests.length > 0 && (
        <p className={css({ fontSize: 'xs', color: 'fg.subtle', truncate: true })}>
          {member.interests.map((interest) => `#${interest}`).join(' ')}
        </p>
      )}
    </Link>
  )
}
