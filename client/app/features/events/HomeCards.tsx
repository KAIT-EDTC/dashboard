import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { CalendarIcon, PackageIcon } from '~/components/ui/Icons'
import { formatDateTime } from '~/lib/format'
import { RsvpBadge } from './EventBadges'
import type { EventListItem, MyItem } from './types'

const rowLink = css({
  display: 'flex',
  alignItems: 'center',
  gap: 'sm',
  px: 'lg',
  py: '12px',
  color: 'fg',
  borderTopWidth: '1px',
  _hover: { bg: 'surface.subtle', color: 'fg' },
})

export function UpcomingEventsCard({ events }: { events: EventListItem[] }) {
  // 対象外のイベントは催促しない
  const unanswered = events.filter((e) => !e.myStatus && e.isTarget).length
  return (
    <Card
      title="これからのイベント"
      action={<Link to="/events" className={css({ fontSize: 'sm' })}>すべて見る</Link>}
      padded={false}
    >
      {unanswered > 0 && (
        <p className={css({ px: 'lg', py: 'sm', fontSize: 'sm', bg: 'danger.subtle', color: 'danger.fg' })}>未回答のイベントが {unanswered} 件あります</p>
      )}
      {events.length === 0 ? (
        <EmptyState icon={<CalendarIcon size={28} />} title="予定されているイベントはありません" />
      ) : (
        <ul>
          {events.slice(0, 6).map((event) => (
            <li key={event.id}>
              <Link to={`/events/${event.id}`} className={rowLink}>
                <span className={css({ fontSize: 'sm', color: 'fg.muted', minW: '112px', flexShrink: 0 })}>{formatDateTime(event.startsAt)}</span>
                <span className={css({ flex: 1, minW: 0, fontWeight: '500', truncate: true })}>{event.title}</span>
                <RsvpBadge status={event.myStatus} isTarget={event.isTarget} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function MyItemsCard({ items }: { items: MyItem[] }) {
  return (
    <Card title="自分が用意する持ち物" padded={false}>
      {items.length === 0 ? (
        <EmptyState icon={<PackageIcon size={28} />} title="担当している持ち物はありません" />
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/events/${item.eventId}`} className={rowLink}>
                <span className={css({ flex: 1, minW: 0 })}>
                  <span className={css({ display: 'block', fontWeight: '500' })}>
                    {item.name}
                    {item.quantity > 1 && ` ×${item.quantity}`}
                  </span>
                  <span className={css({ display: 'block', fontSize: 'xs', color: 'fg.muted', truncate: true })}>
                    {formatDateTime(item.startsAt)} {item.eventTitle}
                  </span>
                </span>
                {item.prepared ? <Badge tone="success">準備済み</Badge> : <Badge tone="warning">未準備</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
