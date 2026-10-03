import { redirect, useNavigation } from 'react-router'
import { ButtonLink } from '~/components/ui/Button'
import { PageHeader } from '~/components/ui/PageHeader'
import { filesFrom, uploadAttachments } from '~/features/events/attachments'
import { parseEventForm } from '~/features/events/event-form'
import { EventForm } from '~/features/events/EventForm'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import type { Route } from './+types/new'

export const meta: Route.MetaFunction = () => [{ title: 'イベントを作成 | EDTC ダッシュボード' }]

export async function clientLoader() {
  return unwrap(api.members.$get())
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData()
  const parsed = parseEventForm(form)
  if (!parsed.success) return zodErrors(parsed.error)
  const result = await catchApiError(() => unwrap(api.events.$post({ json: parsed.data })))
  if (result.errors) return result.errors
  // イベントは作成済みなので、添付に失敗しても取り消さず、詳細ページで知らせる
  const failed = await uploadAttachments(result.data.id, filesFrom(form, 'files'))
  return redirect(`/events/${result.data.id}${failed.length > 0 ? `?attachFailed=${failed.length}` : ''}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function NewEventPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation()
  return (
    <>
      <PageHeader title="イベントを作成" description="作成するとDiscordに通知され、メンバーが出欠を回答できるようになります。" back={{ to: '/events', label: 'イベント一覧' }} />
      <EventForm
        members={loaderData.members}
        errors={actionData}
        submitting={navigation.state === 'submitting'}
        submitLabel="作成する"
        secondaryActions={<ButtonLink to="/events" variant="ghost">キャンセル</ButtonLink>}
      />
    </>
  )
}
