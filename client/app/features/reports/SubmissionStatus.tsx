import { Link } from 'react-router'
import { css, cx } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { CalendarIcon } from '~/components/ui/Icons'
import { RoleBadge } from '~/features/events/EventBadges'
import { formatDateTime, fullName } from '~/lib/format'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { SubmissionStatusEvent } from './types'

const memberStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: 'sm',
  px: 'sm',
  py: 'xs',
  borderRadius: 'md',
  color: 'fg',
  fontSize: 'sm',
})
const memberLinkStyle = css({ _hover: { bg: 'surface.subtle', color: 'fg' } })

function EventStatus({ event }: { event: SubmissionStatusEvent }) {
  const count = (status: string | null) => event.members.filter((m) => m.status === status).length
  const approved = count('approved')
  const total = event.members.length
  return (
    <Card
      title={
        <span className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 'sm' })}>
          <Link to={`/events/${event.id}`}>{event.title}</Link>
          <span className={css({ fontSize: 'xs', fontWeight: '400', color: 'fg.muted' })}>{formatDateTime(event.startsAt)}</span>
        </span>
      }
      action={
        <span className={css({ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' })}>
          <Badge tone={approved === total && total > 0 ? 'success' : 'neutral'}>
            承認済み {approved} / {total}
          </Badge>
          {count('submitted') > 0 && <Badge tone="warning">承認待ち {count('submitted')}</Badge>}
          {count('rejected') > 0 && <Badge tone="danger">差し戻し {count('rejected')}</Badge>}
          {count(null) > 0 && <Badge>未提出 {count(null)}</Badge>}
        </span>
      }
    >
      {total === 0 ? (
        <p className={css({ fontSize: 'sm', color: 'fg.subtle' })}>参加者がいません</p>
      ) : (
        <ul className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'xs' })}>
          {event.members.map((member) => {
            const body = (
              <>
                <Avatar user={member.user} size={24} />
                <span className={css({ flex: 1, minW: 0, truncate: true })}>{fullName(member.user)}</span>
                <RoleBadge role={member.role} />
                <ReportStatusBadge status={member.status} emptyLabel="未提出" />
              </>
            )
            return (
              <li key={member.user.id}>
                {member.reportId ? (
                  <Link to={`/reports/${member.reportId}`} className={cx(memberStyle, memberLinkStyle)}>
                    {body}
                  </Link>
                ) : (
                  <div className={memberStyle}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** 提出状況: 始まったイベントごとに、参加者全員の報告書の状況（下書きは未提出として扱う） */
export function SubmissionStatus({ events }: { events: SubmissionStatusEvent[] }) {
  if (events.length === 0) return <EmptyState icon={<CalendarIcon size={28} />} title="まだ始まったイベントはありません" />
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
      <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
        直近20件のイベントについて、参加した人全員の提出状況を表示しています。中身を見られるのは承認済みの報告書と自分の報告書だけです。
      </p>
      {events.map((event) => (
        <EventStatus key={event.id} event={event} />
      ))}
    </div>
  )
}
