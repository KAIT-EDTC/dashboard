import { isLeader, todayInJst } from '@edtc/shared'
import { css } from 'styled-system/css'
import { PageHeader } from '~/components/ui/PageHeader'
import { TabLinks } from '~/components/ui/Tabs'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { ExportButton } from '~/features/reports/ExportButton'
import { MyReportList, ReviewList, SummaryTargetList, TargetList } from '~/features/reports/ReportLists'
import { SubmissionStatus } from '~/features/reports/SubmissionStatus'
import { api, unwrap } from '~/lib/api'
import type { Route } from './+types/list'

export const meta: Route.MetaFunction = () => [{ title: '活動報告書 | EDTC ダッシュボード' }]

const TABS = ['targets', 'mine', 'review', 'status'] as const
type Tab = (typeof TABS)[number]

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const param = new URL(request.url).searchParams.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(param ?? '') ? (param as Tab) : 'targets'
  // 承認待ちの件数はタブに出すので常に読む（承認する立場でなければ空）。提出状況はそのタブを開いたときだけ
  const [{ targets, summaries }, { reports: mine }, { reports: review }, status] = await Promise.all([
    unwrap(api.reports.targets.$get()),
    unwrap(api.reports.mine.$get()),
    unwrap(api.reports.review.$get()),
    tab === 'status' ? unwrap(api.reports.status.$get()) : Promise.resolve({ events: [] }),
  ])
  return { tab, targets, summaries, mine, review, statusEvents: status.events }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function ReportsPage({ loaderData }: Route.ComponentProps) {
  const { tab, targets, summaries, mine, review, statusEvents } = loaderData
  const me = useCurrentUser()
  const isReviewer = isLeader(me)
  const unwritten = targets.filter((t) => !t.reportStatus).length + summaries.filter((s) => !s.reportStatus).length

  return (
    <>
      <PageHeader title="活動報告書" actions={<ExportButton zipName={`活動報告書_${todayInJst()}.zip`} />} />
      <div className={css({ mb: 'lg' })}>
        <TabLinks
          items={[
            { to: '?', label: unwritten > 0 ? `対象イベント（未作成 ${unwritten}）` : '対象イベント', active: tab === 'targets' },
            { to: '?tab=mine', label: '自分の報告書', active: tab === 'mine' },
            ...(isReviewer ? [{ to: '?tab=review', label: `承認待ち（${review.length}）`, active: tab === 'review' }] : []),
            { to: '?tab=status', label: '提出状況', active: tab === 'status' },
          ]}
        />
      </div>
      {tab === 'targets' && (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <SummaryTargetList summaries={summaries} />
          <TargetList targets={targets} />
        </div>
      )}
      {tab === 'mine' && <MyReportList reports={mine} />}
      {tab === 'review' && <ReviewList reports={review} />}
      {tab === 'status' && <SubmissionStatus events={statusEvents} />}
    </>
  )
}
