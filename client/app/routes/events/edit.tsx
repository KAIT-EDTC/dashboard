import { redirect, useNavigation, useSubmit } from 'react-router'
import { Button, ButtonLink } from '~/components/ui/Button'
import { TrashIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { filesFrom, uploadAttachments } from '~/features/events/attachments'
import { parseEventForm } from '~/features/events/event-form'
import { EventForm } from '~/features/events/EventForm'
import { api, unwrap } from '~/lib/api'
import { catchApiError, texts, zodErrors } from '~/lib/form'
import type { Route } from './+types/edit'

export const meta: Route.MetaFunction = () => [{ title: 'イベントを編集 | EDTC ダッシュボード' }]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [{ event, canManage }, { members }, { categories }] = await Promise.all([
    unwrap(api.events[':id'].$get({ param: { id: params.eventId } })),
    unwrap(api.members.$get()),
    unwrap(api.events.categories.$get()),
  ])
  if (!canManage) throw redirect(`/events/${event.id}`)
  return { event, members, categories }
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const form = await request.formData()
  const param = { id: params.eventId }

  if (form.get('intent') === 'delete') {
    const result = await catchApiError(() => unwrap(api.events[':id'].$delete({ param })))
    if (result.errors) return result.errors
    return redirect('/events')
  }

  const parsed = parseEventForm(form)
  if (!parsed.success) return zodErrors(parsed.error)
  const result = await catchApiError(() => unwrap(api.events[':id'].$put({ param, json: parsed.data })))
  if (result.errors) return result.errors

  // 削除を先に済ませてから追加する（個数の上限に収まるように）。失敗しても保存は取り消さず、詳細ページで知らせる
  let failed = 0
  for (const attachmentId of texts(form, 'removeAttachmentIds')) {
    const removal = await catchApiError(() => unwrap(api.events[':id'].attachments[':attachmentId'].$delete({ param: { ...param, attachmentId } })))
    if (removal.errors) failed++
  }
  failed += (await uploadAttachments(params.eventId, filesFrom(form, 'files'))).length
  return redirect(`/events/${params.eventId}${failed > 0 ? `?attachFailed=${failed}` : ''}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function EditEventPage({ loaderData, actionData }: Route.ComponentProps) {
  const { event, members, categories } = loaderData
  const navigation = useNavigation()
  const submit = useSubmit()
  const deleting = navigation.formData?.get('intent') === 'delete'

  const onDelete = () => {
    if (confirm(`「${event.title}」を削除しますか？出欠や持ち物の記録も削除されます。`)) {
      submit({ intent: 'delete' }, { method: 'post' })
    }
  }

  return (
    <>
      <PageHeader title="イベントを編集" back={{ to: `/events/${event.id}`, label: event.title }} />
      <EventForm
        defaultValue={{ ...event, targetUserIds: event.targetUsers.map((user) => user.id) }}
        attachments={event.attachments}
        eventId={event.id}
        categories={categories}
        members={members}
        errors={actionData}
        submitting={navigation.state === 'submitting' && !deleting}
        submitLabel="保存する"
        secondaryActions={
          <>
            <Button variant="danger" onClick={onDelete} loading={deleting}>
              <TrashIcon size={16} />
              削除
            </Button>
            <ButtonLink to={`/events/${event.id}`} variant="ghost">
              キャンセル
            </ButtonLink>
          </>
        }
      />
    </>
  )
}
