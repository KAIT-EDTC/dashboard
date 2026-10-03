import type { ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Card } from '~/components/ui/Card'
import { ClockIcon, MapPinIcon, UserIcon, UsersIcon, WalletIcon } from '~/components/ui/Icons'
import { formatDateTime, formatRange, formatYen, fullName } from '~/lib/format'
import type { EventDetail } from './types'

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className={css({ display: 'flex', gap: 'sm', alignItems: 'flex-start' })}>
      <span className={css({ color: 'fg.subtle', mt: '2px' })}>{icon}</span>
      <div>
        <dt className={css({ fontSize: 'xs', color: 'fg.subtle', fontWeight: '600' })}>{label}</dt>
        <dd className={css({ fontSize: 'sm' })}>{children}</dd>
      </div>
    </div>
  )
}

export function EventInfo({ event }: { event: EventDetail }) {
  const goingCount = event.participants.filter((p) => p.status === 'going').length
  return (
    <Card title="概要">
      <dl className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', sm: '1fr 1fr' }, gap: 'md' })}>
        <Row icon={<ClockIcon size={16} />} label="日時">
          {formatRange(event.startsAt, event.endsAt)}
        </Row>
        <Row icon={<MapPinIcon size={16} />} label="場所">
          {event.location || '未定'}
        </Row>
        <Row icon={<UsersIcon size={16} />} label="参加者">
          {goingCount}人{event.capacity ? ` / 定員 ${event.capacity}人` : ''}
          {event.rsvpDeadline && <span className={css({ display: 'block', color: 'fg.muted', fontSize: 'xs' })}>回答期限: {formatDateTime(event.rsvpDeadline)}</span>}
        </Row>
        <Row icon={<WalletIcon size={16} />} label="参加費">
          {event.fee ? formatYen(event.fee) : 'なし'}
        </Row>
        <Row icon={<UserIcon size={16} />} label="対象">
          {event.targetDivisions.length === 0 && event.targetUsers.length === 0
            ? '全員'
            : [...event.targetDivisions, ...event.targetUsers.map((user) => fullName(user))].join('、')}
        </Row>
      </dl>
      {event.description && <p className={css({ mt: 'lg', whiteSpace: 'pre-wrap', lineHeight: '1.8' })}>{event.description}</p>}
      <div className={css({ mt: 'lg', display: 'flex', alignItems: 'center', gap: 'sm', fontSize: 'sm', color: 'fg.muted' })}>
        <Avatar user={event.creator} size={24} />
        主催: {fullName(event.creator)}
      </div>
    </Card>
  )
}
