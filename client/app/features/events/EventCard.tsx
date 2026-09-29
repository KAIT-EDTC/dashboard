import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { ClockIcon, MapPinIcon, UsersIcon } from '~/components/ui/Icons'
import { formatRange } from '~/lib/format'
import { CategoryBadge, RsvpBadge } from './EventBadges'
import type { EventListItem } from './types'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function DateBlock({ startsAt }: { startsAt: string }) {
  const [y, m, d] = startsAt.slice(0, 10).split('-').map(Number)
  return (
    <div className={css({ w: '56px', flexShrink: 0, textAlign: 'center', py: 'xs', bg: 'accent.subtle', color: 'accent.fg', borderRadius: 'md' })}>
      <p className={css({ fontSize: 'xs', fontWeight: '600' })}>{m}月</p>
      <p className={css({ fontSize: '2xl', fontWeight: '700', lineHeight: '1.1' })}>{d}</p>
      <p className={css({ fontSize: 'xs' })}>{WEEKDAYS[new Date(y, m - 1, d).getDay()]}</p>
    </div>
  )
}

export function EventCard({ event }: { event: EventListItem }) {
  const meta = css({ display: 'inline-flex', alignItems: 'center', gap: '4px' })
  return (
    <Link
      to={`/events/${event.id}`}
      className={css({
        display: 'flex',
        gap: 'md',
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
      <DateBlock startsAt={event.startsAt} />
      <div className={css({ flex: 1, minW: 0, display: 'flex', flexDirection: 'column', gap: '6px' })}>
        <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'xs' })}>
          <CategoryBadge category={event.category} />
          <RsvpBadge status={event.myStatus} />
        </div>
        <p className={css({ fontWeight: '600', fontSize: 'md' })}>{event.title}</p>
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'md', fontSize: 'sm', color: 'fg.muted' })}>
          <span className={meta}>
            <ClockIcon size={14} />
            {formatRange(event.startsAt, event.endsAt)}
          </span>
          {event.location && (
            <span className={meta}>
              <MapPinIcon size={14} />
              {event.location}
            </span>
          )}
          <span className={meta}>
            <UsersIcon size={14} />
            参加 {event.goingCount}
            {event.capacity ? ` / ${event.capacity}` : ''}人{event.maybeCount > 0 && `・未定 ${event.maybeCount}人`}
          </span>
        </div>
      </div>
    </Link>
  )
}
