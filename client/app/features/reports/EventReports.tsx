import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { FileTextIcon } from '~/components/ui/Icons'
import { RoleBadge } from '~/features/events/EventBadges'
import type { EventDetail, EventReport } from '~/features/events/types'
import { fullName } from '~/lib/format'
import { ExportButton } from './ExportButton'
import { RatingMeter } from './Rating'

/** イベント詳細: 承認済みの活動報告書 */
export function EventReports({ event, reports }: { event: EventDetail; reports: EventReport[] }) {
  // 講師を置かないイベントには役割がない
  const roleOf = (userId: string) => (event.hasLecturer ? event.participants.find((p) => p.userId === userId)?.role : undefined)
  return (
    <Card
      title={`活動報告書（${reports.length}）`}
      action={reports.length > 0 && <ExportButton size="sm" eventId={event.id} zipName={`活動報告書_${event.title.replace(/[\\/:*?"<>|]/g, '_')}.zip`} />}
      padded={false}
    >
      {reports.length === 0 ? (
        <EmptyState icon={<FileTextIcon size={28} />} title="承認された報告書はまだありません" />
      ) : (
        <ul>
          {reports.map((report) => {
            const role = roleOf(report.authorId)
            return (
              <li key={report.id}>
                <Link
                  to={`/reports/${report.id}`}
                  className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', px: 'lg', py: '12px', color: 'fg', borderTopWidth: '1px', _first: { borderTopWidth: '0' }, _hover: { bg: 'surface.subtle', color: 'fg' } })}
                >
                  <span className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm' })}>
                    <Avatar user={report.author} size={24} />
                    <span className={css({ fontSize: 'sm', fontWeight: '600' })}>{fullName(report.author)}</span>
                    {role && <RoleBadge role={role} />}
                    {report.division && <Badge>{report.division}</Badge>}
                    <span className={css({ ml: 'auto' })}>
                      <RatingMeter value={report.rating} />
                    </span>
                  </span>
                  <span className={css({ fontSize: 'sm', color: 'fg.muted', lineClamp: 2, whiteSpace: 'pre-wrap' })}>{report.content}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** イベント詳細: 承認済み報告書の伝言事項・特記事項を連絡事項としてまとめる */
export function EventNotices({ reports }: { reports: EventReport[] }) {
  const notices = reports.filter((report) => report.notes)
  if (notices.length === 0) return null
  return (
    <Card title="連絡事項" padded={false}>
      <ul>
        {notices.map((report) => (
          <li key={report.id} className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', px: 'lg', py: '12px', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
            <p className={css({ fontSize: 'sm', lineHeight: '1.8', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })}>{report.notes}</p>
            <span className={css({ display: 'flex', alignItems: 'center', gap: 'xs', fontSize: 'xs', color: 'fg.muted' })}>
              <Avatar user={report.author} size={18} />
              {fullName(report.author)}
              {report.division && `（${report.division}）`}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
