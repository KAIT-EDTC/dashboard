import { css } from 'styled-system/css'
import { PageHeader } from '~/components/ui/PageHeader'
import { TabLinks } from '~/components/ui/Tabs'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MyReportList, ReviewList, TargetList } from '~/features/reports/ReportLists'
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
  const [{ targets }, { reports: mine }, { reports: review }, status] = await Promise.all([
    unwrap(api.reports.targets.$get()),
    unwrap(api.reports.mine.$get()),
    unwrap(api.reports.review.$get()),
    tab === 'status' ? unwrap(api.reports.status.$get()) : Promise.resolve({ events: [] }),
  ])
  return { tab, targets, mine, review, statusEvents: status.events }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function ReportsPage({ loaderData }: Route.ComponentProps) {
  const { tab, targets, mine, review, statusEvents } = loaderData
  const me = useCurrentUser()
  const isReviewer = !!me.officer || me.headOf.length > 0
  const unwritten = targets.filter((t) => !t.reportStatus).length

  return (
    <>
      <PageHeader title="活動報告書" />
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
      {tab === 'targets' && <TargetList targets={targets} />}
      {tab === 'mine' && <MyReportList reports={mine} />}
      {tab === 'review' && <ReviewList reports={review} />}
      {tab === 'status' && <SubmissionStatus events={statusEvents} />}
    </>
  )
}
