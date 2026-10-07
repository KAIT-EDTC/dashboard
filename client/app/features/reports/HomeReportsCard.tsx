import { isEditableStatus, type ReportStatus } from '@edtc/shared'
import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { CheckIcon, FileTextIcon } from '~/components/ui/Icons'
import { formatDateTime, formatTimestamp, fullName } from '~/lib/format'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { ReportTarget, ReviewItem, SummaryTarget } from './types'

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

/** まだ出していない（未作成・下書き・修正依頼） */
const needsAction = (status: ReportStatus | null) => !status || isEditableStatus(status)

type Row = { key: string; to: string; startsAt: string; title: string; status: ReportStatus | null; summary?: SummaryTarget }

/** ホーム用: 自分が出す活動報告書・まとめ報告書 */
export function HomeReportsCard({ targets, summaries }: { targets: ReportTarget[]; summaries: SummaryTarget[] }) {
  const rows: Row[] = [
    ...summaries
      .filter((s) => needsAction(s.reportStatus))
      .map((s) => ({
        key: `summary-${s.eventId}`,
        to: s.reportId ? `/reports/${s.reportId}` : `/reports/summaries/new?eventId=${encodeURIComponent(s.eventId)}`,
        startsAt: s.startsAt,
        title: s.eventTitle,
        status: s.reportStatus,
        summary: s,
      })),
    ...targets
      .filter((t) => needsAction(t.reportStatus))
      .map((t) => ({
        key: `activity-${t.eventId}`,
        to: t.reportId ? `/reports/${t.reportId}` : `/reports/new?eventId=${encodeURIComponent(t.eventId)}`,
        startsAt: t.startsAt,
        title: t.eventTitle,
        status: t.reportStatus,
      })),
  ].sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  return (
    <Card title="自分が出す報告書" action={<Link to="/reports" className={css({ fontSize: 'sm' })}>すべて見る</Link>} padded={false}>
      {rows.length === 0 ? (
        <EmptyState icon={<FileTextIcon size={28} />} title="出す報告書はありません" />
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.key}>
              <Link to={row.to} className={rowLink}>
                <span className={css({ flex: 1, minW: 0 })}>
                  <span className={css({ display: 'flex', alignItems: 'center', gap: 'xs', fontWeight: '500' })}>
                    {row.summary && <Badge tone="accent">まとめ</Badge>}
                    <span className={css({ truncate: true })}>{row.title}</span>
                  </span>
                  <span className={css({ display: 'block', fontSize: 'xs', color: 'fg.muted' })}>
                    {formatDateTime(row.startsAt)}
                    {row.summary && `・活動報告書 ${row.summary.submitted} / ${row.summary.total}`}
                  </span>
                </span>
                <ReportStatusBadge status={row.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** ホーム用: 自分が確認する（承認待ちの）報告書。承認する立場の人だけに出す */
export function HomeReviewCard({ reports }: { reports: ReviewItem[] }) {
  return (
    <Card title="承認待ちの報告書" action={<Link to="/reports?tab=review" className={css({ fontSize: 'sm' })}>すべて見る</Link>} padded={false}>
      {reports.length === 0 ? (
        <EmptyState icon={<CheckIcon size={28} />} title="承認待ちの報告書はありません" />
      ) : (
        <ul>
          {reports.slice(0, 5).map((report) => (
            <li key={report.id}>
              <Link to={`/reports/${report.id}`} className={rowLink}>
                <Avatar user={report.author} size={24} />
                <span className={css({ flex: 1, minW: 0 })}>
                  <span className={css({ display: 'flex', alignItems: 'center', gap: 'xs', fontWeight: '500' })}>
                    {report.kind === 'summary' && <Badge tone="accent">まとめ</Badge>}
                    <span className={css({ truncate: true })}>{report.event.title}</span>
                  </span>
                  <span className={css({ display: 'block', fontSize: 'xs', color: 'fg.muted', truncate: true })}>
                    {fullName(report.author)}
                    {report.submittedAt && `・${formatTimestamp(report.submittedAt)} 提出`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
