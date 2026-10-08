import { ITEM_KINDS, RSVP_STATUSES } from '@edtc/shared'
import { Form, useSearchParams } from 'react-router'
import { css } from 'styled-system/css'
import { Button, ButtonLink } from '~/components/ui/Button'
import { EditIcon, PenIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { CategoryBadge } from '~/features/events/EventBadges'
import { Alert } from '~/components/ui/Alert'
import { filesFrom, uploadAttachments } from '~/features/events/attachments'
import { EventInfo } from '~/features/events/EventInfo'
import { ItemList } from '~/features/events/ItemList'
import { ParticipantList } from '~/features/events/ParticipantList'
import { RsvpPanel } from '~/features/events/RsvpPanel'
import { ApiError, api, unwrap } from '~/lib/api'
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
      case 'delete-item':
        return unwrap(api.events[':id'].items[':itemId'].$delete({ param: { id, itemId: text(form, 'itemId') } }))
      case 'upload-attachment': {
        const files = filesFrom(form, 'file')
        if (files.length === 0) throw new ApiError(400, 'ファイルを選択してください')
        const failed = await uploadAttachments(id, files)
        if (failed.length > 0) throw new ApiError(400, failed.join('\n'))
        return { ok: true }
      }
      case 'delete-attachment':
        return unwrap(api.events[':id'].attachments[':attachmentId'].$delete({ param: { id, attachmentId: text(form, 'attachmentId') } }))
      case 'update-participant':
        return unwrap(
          api.events[':id'].participants[':userId'].$patch({
            param: { id, userId: text(form, 'userId') },
            json: { attended: bool(text(form, 'attended')), paid: bool(text(form, 'paid')) },
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
  const { event, canManage, isTarget, pending } = loaderData
  const me = useCurrentUser()
  const [params] = useSearchParams()
  const attachFailed = Number(params.get('attachFailed')) || 0

  return (
    <>
      <PageHeader
        title={event.title}
        description={<CategoryBadge label={event.categoryLabel} tone={event.categoryTone} />}
        back={{ to: '/events', label: 'イベント一覧' }}
        actions={
          <>
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
      {attachFailed > 0 && (
        <div className={css({ mb: 'lg' })}>
          <Alert tone="warning">{`イベントは保存しましたが、添付ファイルの追加・削除に失敗したものが${attachFailed}件あります。「概要」の添付ファイルを確認して、もう一度操作してください。`}</Alert>
        </div>
      )}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '3fr 2fr' }, gap: 'lg', alignItems: 'start' })}>
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <EventInfo event={event} canManage={canManage} />
          <ItemList event={event} userId={me.id} canManage={canManage} />
        </div>
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <RsvpPanel event={event} userId={me.id} canManage={canManage} isTarget={isTarget} />
          <ParticipantList event={event} pending={pending} canManage={canManage} />
        </div>
      </div>
    </>
  )
}
