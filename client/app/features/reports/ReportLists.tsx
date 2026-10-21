import { isEditableStatus, type ReportStatus } from '@edtc/shared'
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
import type { MyReport, ReportTarget, ReviewItem, SummaryTarget } from './types'

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

function ListCard({ title, empty, children }: { title?: ReactNode; empty: ReactNode | null; children: ReactNode }) {
  return (
    <Card title={title} padded={false}>
      {empty ?? <ul>{children}</ul>}
    </Card>
  )
}

const actionStyle = css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm', fontWeight: '600', color: 'accent.fg', minW: '84px', justifyContent: 'flex-end' })

/** 書く・続きを書く・見る */
function RowAction({ exists, editable }: { exists: boolean; editable: boolean }) {
  return (
    <span className={actionStyle}>
      {!exists ? (
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
  )
}

const isEditable = (status: ReportStatus | null) => !!status && isEditableStatus(status)

/** 自分が担当するまとめ報告書。参加者全員の活動報告書の提出状況も出す */
export function SummaryTargetList({ summaries }: { summaries: SummaryTarget[] }) {
  if (summaries.length === 0) return null
  return (
    <ListCard title="まとめ報告書" empty={null}>
      {summaries.map((summary) => (
        <li key={summary.eventId}>
          <Link
            to={summary.reportId ? `/reports/${summary.reportId}` : `/reports/summaries/new?eventId=${encodeURIComponent(summary.eventId)}`}
            className={cx(rowStyle, rowLinkStyle)}
          >
            <span className={dateStyle}>{formatDateTime(summary.startsAt)}</span>
            <span className={titleStyle}>{summary.eventTitle}</span>
            <Badge tone={summary.submitted === summary.total && summary.total > 0 ? 'success' : 'neutral'}>
              活動報告書 {summary.submitted} / {summary.total}
            </Badge>
            <ReportStatusBadge status={summary.reportStatus} />
            <RowAction exists={!!summary.reportId} editable={isEditable(summary.reportStatus)} />
          </Link>
        </li>
      ))}
    </ListCard>
  )
}

/** 報告書を書けるイベント（参加した・開始済み）。選ぶと作成ページ（書いていればその報告書）へ */
export function TargetList({ targets }: { targets: ReportTarget[] }) {
  return (
    <ListCard
      empty={
        targets.length === 0 ? (
          <EmptyState icon={<CalendarIcon size={28} />} title="報告書を書けるイベントはありません" />
        ) : null
      }
    >
      {targets.map((target) => (
        <li key={target.eventId}>
          <Link
            to={target.reportId ? `/reports/${target.reportId}` : `/reports/new?eventId=${encodeURIComponent(target.eventId)}`}
            className={cx(rowStyle, rowLinkStyle)}
          >
            <span className={dateStyle}>{formatDateTime(target.startsAt)}</span>
            <span className={titleStyle}>{target.eventTitle}</span>
            {target.role && <RoleBadge role={target.role} />}
            <ReportStatusBadge status={target.reportStatus} />
            <RowAction exists={!!target.reportId} editable={isEditable(target.reportStatus)} />
          </Link>
        </li>
      ))}
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
            {report.kind === 'summary' && <Badge tone="accent">まとめ</Badge>}
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
            {report.kind === 'summary' && <Badge tone="accent">まとめ</Badge>}
            {report.division && <Badge tone="accent">{report.division}</Badge>}
            <ReportStatusBadge status={report.status} step={report.approvalSteps[report.currentStep]} />
            {report.submittedAt && <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>{formatTimestamp(report.submittedAt)} 提出</span>}
          </Link>
        </li>
      ))}
    </ListCard>
  )
}
