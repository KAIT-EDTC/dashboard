import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { css, cx } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { CalendarIcon, CheckIcon, EditIcon, FileTextIcon, PenIcon } from '~/components/ui/Icons'
import { RoleBadge } from '~/features/events/EventBadges'
import { formatDateTime, formatTimestamp, fullName } from '~/lib/format'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { MyReport, ReportTarget, ReviewItem } from './types'

const rowStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'sm',
  px: 'lg',
  py: '12px',
  color: 'fg',
  borderTopWidth: '1px',
  _first: { borderTopWidth: '0' },
})
const rowLinkStyle = css({ _hover: { bg: 'surface.subtle', color: 'fg' } })
const dateStyle = css({ fontSize: 'sm', color: 'fg.muted', minW: '112px', flexShrink: 0 })
const titleStyle = css({ flex: 1, minW: '160px', fontWeight: '500', truncate: true })

function ListCard({ empty, children }: { empty: ReactNode | null; children: ReactNode }) {
  return <Card padded={false}>{empty ?? <ul>{children}</ul>}</Card>
}

/** 報告書を書けるイベント（参加した・開始済み）。選ぶと作成ページ（書いていればその報告書）へ */
export function TargetList({ targets }: { targets: ReportTarget[] }) {
  return (
    <ListCard
      empty={
        targets.length === 0 ? (
          <EmptyState icon={<CalendarIcon size={28} />} title="報告書を書けるイベントはありません">
            イベントに「参加」と回答し、イベントが始まるとここに表示されます
          </EmptyState>
        ) : null
      }
    >
      {targets.map((target) => {
        const editable = target.reportStatus === 'draft' || target.reportStatus === 'rejected'
        return (
          <li key={target.eventId}>
            <Link
              to={target.reportId ? `/reports/${target.reportId}` : `/reports/new?eventId=${encodeURIComponent(target.eventId)}`}
              className={cx(rowStyle, rowLinkStyle)}
            >
              <span className={dateStyle}>{formatDateTime(target.startsAt)}</span>
              <span className={titleStyle}>{target.eventTitle}</span>
              <RoleBadge role={target.role} />
              <ReportStatusBadge status={target.reportStatus} />
              <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm', fontWeight: '600', color: 'accent.fg', minW: '84px', justifyContent: 'flex-end' })}>
                {!target.reportId ? (
                  <>
                    <PenIcon size={14} />
                    書く
                  </>
                ) : editable ? (
                  <>
                    <EditIcon size={14} />
                    続きを書く
                  </>
                ) : (
                  <>
                    <FileTextIcon size={14} />
                    見る
                  </>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ListCard>
  )
}

export function MyReportList({ reports }: { reports: MyReport[] }) {
  return (
    <ListCard empty={reports.length === 0 ? <EmptyState icon={<FileTextIcon size={28} />} title="まだ報告書はありません" /> : null}>
      {reports.map((report) => (
        <li key={report.id}>
          <Link to={`/reports/${report.id}`} className={cx(rowStyle, rowLinkStyle)}>
            <span className={dateStyle}>{formatDateTime(report.startsAt)}</span>
            <span className={titleStyle}>{report.eventTitle}</span>
            {report.division && <Badge>{report.division}</Badge>}
            <ReportStatusBadge status={report.status} step={report.approvalSteps[report.currentStep]} />
            <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>{formatTimestamp(report.updatedAt)}</span>
          </Link>
        </li>
      ))}
    </ListCard>
  )
}

export function ReviewList({ reports }: { reports: ReviewItem[] }) {
  return (
    <ListCard empty={reports.length === 0 ? <EmptyState icon={<CheckIcon size={28} />} title="承認待ちの報告書はありません" /> : null}>
      {reports.map((report) => (
        <li key={report.id}>
          <Link to={`/reports/${report.id}`} className={cx(rowStyle, rowLinkStyle)}>
            <span className={css({ display: 'flex', alignItems: 'center', gap: 'sm', minW: '140px' })}>
              <Avatar user={report.author} size={24} />
              <span className={css({ fontSize: 'sm', fontWeight: '500' })}>{fullName(report.author)}</span>
            </span>
            <span className={titleStyle}>{report.event.title}</span>
            {report.division && <Badge tone="accent">{report.division}</Badge>}
            <ReportStatusBadge status={report.status} step={report.approvalSteps[report.currentStep]} />
            {report.submittedAt && <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>{formatTimestamp(report.submittedAt)} 提出</span>}
          </Link>
        </li>
      ))}
    </ListCard>
  )
}
