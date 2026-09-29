import { redirect, useNavigation, useSubmit } from 'react-router'
import { Button, ButtonLink } from '~/components/ui/Button'
import { TrashIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { parseEventForm } from '~/features/events/event-form'
import { EventForm } from '~/features/events/EventForm'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import type { Route } from './+types/edit'

export const meta: Route.MetaFunction = () => [{ title: 'イベントを編集 | EDTC ダッシュボード' }]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { event, canManage } = await unwrap(api.events[':id'].$get({ param: { id: params.eventId } }))
  if (!canManage) throw redirect(`/events/${event.id}`)
  return { event }
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
  return redirect(`/events/${params.eventId}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function EditEventPage({ loaderData, actionData }: Route.ComponentProps) {
  const { event } = loaderData
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
        defaultValue={event}
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
