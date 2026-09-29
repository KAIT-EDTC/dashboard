import { todayInJst } from '@edtc/shared'
import { css } from 'styled-system/css'
import { ButtonLink } from '~/components/ui/Button'
import { EmptyState } from '~/components/ui/EmptyState'
import { CalendarIcon, PlusIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { TabLinks } from '~/components/ui/Tabs'
import { calendarRange, EventCalendar } from '~/features/events/EventCalendar'
import { EventCard } from '~/features/events/EventCard'
import { api, unwrap } from '~/lib/api'
import type { Route } from './+types/list'

export const meta: Route.MetaFunction = () => [{ title: 'イベント | EDTC ダッシュボード' }]

type View = { kind: 'list'; scope: 'upcoming' | 'past' } | { kind: 'calendar'; month: string }

function viewOf(url: URL): View {
  const params = url.searchParams
  if (params.get('view') === 'calendar') {
    const month = params.get('month')
    return { kind: 'calendar', month: month && /^\d{4}-\d{2}$/.test(month) ? month : todayInJst().slice(0, 7) }
  }
  return { kind: 'list', scope: params.get('scope') === 'past' ? 'past' : 'upcoming' }
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const view = viewOf(new URL(request.url))
  const { from, to } = view.kind === 'calendar' ? calendarRange(view.month) : { from: undefined, to: undefined }
  const query = view.kind === 'calendar' ? { from, to } : { scope: view.scope }
  const { events } = await unwrap(api.events.$get({ query }))
  return { view, events }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function EventsPage({ loaderData }: Route.ComponentProps) {
  const { view, events } = loaderData
  return (
    <>
      <PageHeader
        title="イベント"
        description="活動・ミーティング・親睦会などの予定と出欠、持ち物をまとめて管理します。"
        actions={
          <ButtonLink to="/events/new" variant="primary">
            <PlusIcon size={16} />
            イベントを作成
          </ButtonLink>
        }
      />
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm', justifyContent: 'space-between', mb: 'lg' })}>
        <TabLinks
          items={[
            { to: '?', label: 'リスト', active: view.kind === 'list' },
            { to: '?view=calendar', label: 'カレンダー', active: view.kind === 'calendar' },
          ]}
        />
        {view.kind === 'list' && (
          <TabLinks
            items={[
              { to: '?', label: 'これから', active: view.scope === 'upcoming' },
              { to: '?scope=past', label: '終了したイベント', active: view.scope === 'past' },
            ]}
          />
        )}
      </div>

      {view.kind === 'calendar' ? (
        <EventCalendar month={view.month} events={events} monthHref={(month) => `?view=calendar&month=${month}`} />
      ) : events.length === 0 ? (
        <EmptyState icon={<CalendarIcon size={32} />} title={view.scope === 'upcoming' ? '予定されているイベントはありません' : '終了したイベントはありません'} />
      ) : (
        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: '1fr 1fr' }, gap: 'md' })}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  )
}
