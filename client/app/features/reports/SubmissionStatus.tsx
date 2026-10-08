import { Link } from 'react-router'
import { css, cva, cx } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { CalendarIcon } from '~/components/ui/Icons'
import { RoleBadge } from '~/features/events/EventBadges'
import { formatDateTime, fullName } from '~/lib/format'
import { ExportButton } from './ExportButton'
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

const summaryRowStyle = cva({
  base: { display: 'flex', alignItems: 'center', gap: 'sm', px: 'sm', py: 'xs', mb: 'sm', borderRadius: 'md', bg: 'surface.subtle', color: 'fg', fontSize: 'sm' },
  variants: { link: { true: { _hover: { bg: 'surface.muted', color: 'fg' } } } },
})

/** まとめ報告書の担当者と状況 */
function SummaryRow({ summary }: { summary: SubmissionStatusEvent['summary'] }) {
  const body = (
    <>
      <span className={css({ fontWeight: '600', flexShrink: 0 })}>まとめ報告書</span>
      {summary.writer ? (
        <>
          <Avatar user={summary.writer} size={24} />
          <span className={css({ flex: 1, minW: 0, truncate: true })}>{fullName(summary.writer)}</span>
        </>
      ) : (
        <span className={css({ flex: 1, color: 'fg.subtle' })}>担当者未定</span>
      )}
      <ReportStatusBadge status={summary.status} emptyLabel="未提出" />
    </>
  )
  return summary.reportId ? (
    <Link to={`/reports/${summary.reportId}`} className={summaryRowStyle({ link: true })}>
      {body}
    </Link>
  ) : (
    <div className={summaryRowStyle()}>{body}</div>
  )
}

function EventStatus({ event }: { event: SubmissionStatusEvent }) {
  // まとめ報告書の担当者は活動報告書を書かなくてよいので数えない
  const required = event.members.filter((m) => !m.isSummaryWriter || m.status)
  const count = (status: string | null) => required.filter((m) => m.status === status).length
  const approved = count('approved')
  const total = required.length
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
          {count('rejected') > 0 && <Badge tone="danger">修正依頼 {count('rejected')}</Badge>}
          {count(null) > 0 && <Badge>未提出 {count(null)}</Badge>}
          {(approved > 0 || event.summary.status === 'approved') && (
            <ExportButton size="sm" eventId={event.id} zipName={`活動報告書_${event.title.replace(/[\\/:*?"<>|]/g, '_')}.zip`} />
          )}
        </span>
      }
    >
      <SummaryRow summary={event.summary} />
      {event.members.length === 0 ? (
        <p className={css({ fontSize: 'sm', color: 'fg.subtle' })}>参加者がいません</p>
      ) : (
        <ul className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'xs' })}>
          {event.members.map((member) => {
            const body = (
              <>
                <Avatar user={member.user} size={24} />
                <span className={css({ flex: 1, minW: 0, truncate: true })}>{fullName(member.user)}</span>
                {member.role && <RoleBadge role={member.role} />}
                {member.isSummaryWriter && !member.status ? <Badge tone="accent">まとめ担当</Badge> : <ReportStatusBadge status={member.status} emptyLabel="未提出" />}
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
      {events.map((event) => (
        <EventStatus key={event.id} event={event} />
      ))}
    </div>
  )
}
