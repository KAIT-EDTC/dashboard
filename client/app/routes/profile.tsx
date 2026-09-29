import { redirect, useNavigation } from 'react-router'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { parseProfileForm } from '~/features/members/profile-form'
import { ProfileForm } from '~/features/members/ProfileForm'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import type { Route } from './+types/profile'

export const meta: Route.MetaFunction = () => [{ title: 'プロフィール編集 | EDTC ダッシュボード' }]

export async function clientAction({ request }: Route.ClientActionArgs) {
  const parsed = parseProfileForm(await request.formData())
  if (!parsed.success) return zodErrors(parsed.error)
  const result = await catchApiError(() => unwrap(api.members.me.$put({ json: parsed.data })))
  if (result.errors) return result.errors
  return redirect(`/members/${result.data.id}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function ProfilePage({ actionData }: Route.ComponentProps) {
  const user = useCurrentUser()
  const navigation = useNavigation()
  return (
    <>
      <PageHeader title="プロフィール編集" description="自己紹介はメンバー一覧・プロフィールページで公開されます。" back={{ to: `/members/${user.id}`, label: 'プロフィール' }} />
      <ProfileForm user={user} errors={actionData} submitting={navigation.state === 'submitting'} />
    </>
  )
}
