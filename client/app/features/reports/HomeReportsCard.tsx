import { isEditableStatus, type ReportStatus } from '@edtc/shared'
import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { FileTextIcon } from '~/components/ui/Icons'
import { formatDateTime } from '~/lib/format'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { ReportTarget, SummaryTarget } from './types'

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

/** ホーム用: 自分が出す活動報告書・まとめ報告書と、承認待ちの件数 */
export function HomeReportsCard({ targets, summaries, reviewCount }: { targets: ReportTarget[]; summaries: SummaryTarget[]; reviewCount: number }) {
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
      {reviewCount > 0 && (
        <Link
          to="/reports?tab=review"
          className={css({ display: 'block', px: 'lg', py: 'sm', fontSize: 'sm', bg: 'warning.subtle', color: 'warning.fg', _hover: { color: 'warning.fg', textDecoration: 'underline' } })}
        >
          承認待ちの報告書が {reviewCount} 件あります
        </Link>
      )}
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
