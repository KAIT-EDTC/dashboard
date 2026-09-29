import { redirect } from 'react-router'
import { css } from 'styled-system/css'
import { PageHeader } from '~/components/ui/PageHeader'
import { TabLinks } from '~/components/ui/Tabs'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MyReportList, ReviewList, TargetList } from '~/features/reports/ReportLists'
import { api, unwrap } from '~/lib/api'
import { text } from '~/lib/form'
import type { Route } from './+types/list'

export const meta: Route.MetaFunction = () => [{ title: '活動報告書 | EDTC ダッシュボード' }]

const TABS = ['targets', 'mine', 'review'] as const
type Tab = (typeof TABS)[number]

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const param = new URL(request.url).searchParams.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(param ?? '') ? (param as Tab) : 'targets'
  // 承認待ちの件数はタブに出すので常に読む（部長・管理者でなければ空）
  const [{ targets }, { reports: mine }, { reports: review }] = await Promise.all([
    unwrap(api.reports.targets.$get()),
    unwrap(api.reports.mine.$get()),
    unwrap(api.reports.review.$get()),
  ])
  return { tab, targets, mine, review }
}

/** イベントを選んで下書きを作り、編集画面へ（イベント詳細の「報告書を書く」からも使う） */
export async function clientAction({ request }: Route.ClientActionArgs) {
  const eventId = text(await request.formData(), 'eventId')
  const { id } = await unwrap(api.reports.$post({ json: { eventId } }))
  return redirect(`/reports/${id}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function ReportsPage({ loaderData }: Route.ComponentProps) {
  const { tab, targets, mine, review } = loaderData
  const me = useCurrentUser()
  const isReviewer = me.role === 'admin' || me.headOf.length > 0
  const unwritten = targets.filter((t) => !t.reportStatus).length

  return (
    <>
      <PageHeader
        title="活動報告書"
        description="参加したイベントを選んで報告書を書き、所属部署の部長に提出します。日時・活動名・場所・役割はイベントから自動で入ります。"
      />
      <div className={css({ mb: 'lg' })}>
        <TabLinks
          items={[
            { to: '?', label: unwritten > 0 ? `対象イベント（未作成 ${unwritten}）` : '対象イベント', active: tab === 'targets' },
            { to: '?tab=mine', label: '自分の報告書', active: tab === 'mine' },
            ...(isReviewer ? [{ to: '?tab=review', label: `承認待ち（${review.length}）`, active: tab === 'review' }] : []),
          ]}
        />
      </div>
      {tab === 'targets' && <TargetList targets={targets} />}
      {tab === 'mine' && <MyReportList reports={mine} />}
      {tab === 'review' && <ReviewList reports={review} />}
    </>
  )
}
