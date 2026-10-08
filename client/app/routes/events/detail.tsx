import { isEditableStatus, ITEM_KINDS, nowInJst, PARTICIPANT_ROLES, RSVP_STATUSES } from '@edtc/shared'
import { Form } from 'react-router'
import { css } from 'styled-system/css'
import { Button, ButtonLink } from '~/components/ui/Button'
import { EditIcon, FileTextIcon, PenIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { CategoryBadge } from '~/features/events/EventBadges'
import { EventInfo } from '~/features/events/EventInfo'
import { ItemList } from '~/features/events/ItemList'
import { ParticipantList } from '~/features/events/ParticipantList'
import { RsvpPanel } from '~/features/events/RsvpPanel'
import { EventNotices, EventReports } from '~/features/reports/EventReports'
import { EventSummary, SummaryButton } from '~/features/reports/EventSummary'
import { api, unwrap } from '~/lib/api'
import { catchApiError, text, type FormErrors } from '~/lib/form'
import type { Route } from './+types/detail'

export const meta: Route.MetaFunction = ({ data }) => [{ title: `${data?.event.title ?? 'イベント'} | EDTC ダッシュボード` }]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return unwrap(api.events[':id'].$get({ param: { id: params.eventId } }))
}

const bool = (value: string) => (value === '' ? undefined : value === 'true')
const oneOf = <T extends string>(values: readonly T[], value: string, fallback: T): T =>
  (values as readonly string[]).includes(value) ? (value as T) : fallback

/** 出欠・持ち物・参加者の記録は、このページの各パネルから intent 付きで送られてくる */
export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const form = await request.formData()
  const id = params.eventId
  const result = await catchApiError(async () => {
    switch (text(form, 'intent')) {
      case 'rsvp':
        return unwrap(
          api.events[':id'].rsvp.$put({
            param: { id },
            json: { status: oneOf(RSVP_STATUSES, text(form, 'status'), 'going'), comment: text(form, 'comment') },
          }),
        )
      case 'add-item':
        return unwrap(
          api.events[':id'].items.$post({
            param: { id },
            json: {
              name: text(form, 'name'),
              kind: oneOf(ITEM_KINDS, text(form, 'kind'), 'shared'),
              quantity: Number(text(form, 'quantity') || 1),
              note: text(form, 'note'),
            },
          }),
        )
      case 'update-item':
        return unwrap(
          api.events[':id'].items[':itemId'].$patch({
            param: { id, itemId: text(form, 'itemId') },
            json: {
              ...(form.has('assigneeId') && { assigneeId: text(form, 'assigneeId') || null }),
              ...(form.has('prepared') && { prepared: bool(text(form, 'prepared')) }),
            },
          }),
        )
      case 'summary-writer':
        return unwrap(api.events[':id']['summary-writer'].$put({ param: { id }, json: { userId: text(form, 'userId') || null } }))
      case 'delete-item':
        return unwrap(api.events[':id'].items[':itemId'].$delete({ param: { id, itemId: text(form, 'itemId') } }))
      case 'update-participant':
        return unwrap(
          api.events[':id'].participants[':userId'].$patch({
            param: { id, userId: text(form, 'userId') },
            json: {
              attended: bool(text(form, 'attended')),
              paid: bool(text(form, 'paid')),
              ...(form.has('role') && { role: oneOf(PARTICIPANT_ROLES, text(form, 'role'), 'assistant') }),
            },
          }),
        )
      default:
        throw new Response('Unknown intent', { status: 400 })
    }
  })
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function EventDetailPage({ loaderData }: Route.ComponentProps) {
  const { event, canManage, isTarget, pending, reports, myReport, canWriteReport, summary } = loaderData
  const me = useCurrentUser()
  const started = event.startsAt <= nowInJst()

  return (
    <>
      <PageHeader
        title={event.title}
        description={<CategoryBadge label={event.categoryLabel} tone={event.categoryTone} />}
        back={{ to: '/events', label: 'イベント一覧' }}
        actions={
          <>
            {myReport ? (
              <ButtonLink to={`/reports/${myReport.id}`}>
                <FileTextIcon size={16} />
                {isEditableStatus(myReport.status) ? '報告書の続きを書く' : '報告書を見る'}
              </ButtonLink>
            ) : (
              canWriteReport && (
                <ButtonLink to={`/reports/new?eventId=${encodeURIComponent(event.id)}`}>
                  <FileTextIcon size={16} />
                  報告書を書く
                </ButtonLink>
              )
            )}
            {event.hasReport && <SummaryButton eventId={event.id} summary={summary} userId={me.id} started={started} />}
            {/* イベントのタイトルと日付を引き継いだブログの下書きを作る */}
            <Form method="post" action="/blog?index">
              <input type="hidden" name="eventId" value={event.id} />
              <Button type="submit">
                <PenIcon size={16} />
                ブログを書く
              </Button>
            </Form>
            {canManage && (
              <ButtonLink to={`/events/${event.id}/edit`}>
                <EditIcon size={16} />
                編集
              </ButtonLink>
            )}
          </>
        }
      />
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '3fr 2fr' }, gap: 'lg', alignItems: 'start' })}>
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <EventInfo event={event} />
          <EventNotices reports={reports} />
          {/* 報告書を書かない種類のイベントには出さない（書かない設定にする前の承認済みの報告書は残す） */}
          {event.hasReport && <EventSummary event={event} summary={summary} canManage={canManage} started={started} />}
          {started && (event.hasReport || reports.length > 0) && <EventReports event={event} reports={reports} />}
          <ItemList event={event} userId={me.id} canManage={canManage} />
        </div>
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <RsvpPanel event={event} userId={me.id} canManage={canManage} isTarget={isTarget} />
          <ParticipantList event={event} pending={pending} canManage={canManage} summary={summary} />
        </div>
      </div>
    </>
  )
}
