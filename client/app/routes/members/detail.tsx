import { ButtonLink } from '~/components/ui/Button'
import { EditIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { ProfileView } from '~/features/members/ProfileView'
import { api, unwrap } from '~/lib/api'
import { fullName } from '~/lib/format'
import type { Route } from './+types/detail'

export const meta: Route.MetaFunction = ({ data }) => [
  { title: `${data ? fullName(data.member) : 'メンバー'} | EDTC ダッシュボード` },
]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return unwrap(api.members[':id'].$get({ param: { id: params.memberId } }))
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function MemberDetailPage({ loaderData }: Route.ComponentProps) {
  const me = useCurrentUser()
  return (
    <>
      <PageHeader title="プロフィール" back={{ to: '/members', label: 'メンバー一覧' }} />
      <ProfileView
        profile={loaderData}
        actions={
          loaderData.member.id === me.id && (
            <ButtonLink to="/profile" variant="secondary">
              <EditIcon size={16} />
              プロフィールを編集
            </ButtonLink>
          )
        }
      />
    </>
  )
}
