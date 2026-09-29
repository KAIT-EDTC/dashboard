import { useSearchParams } from 'react-router'
import { css } from 'styled-system/css'
import { EmptyState } from '~/components/ui/EmptyState'
import { UsersIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { MemberCard } from '~/features/members/MemberCard'
import { filterMembers, MemberFilters } from '~/features/members/MemberFilters'
import { api, unwrap } from '~/lib/api'
import type { Route } from './+types/list'

export const meta: Route.MetaFunction = () => [{ title: 'メンバー | EDTC ダッシュボード' }]

export async function clientLoader() {
  return unwrap(api.members.$get())
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function MembersPage({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams()
  const filter = { q: params.get('q') ?? '', division: params.get('division') ?? '', grade: params.get('grade') ?? '' }
  const members = filterMembers(loaderData.members, filter)
  const grades = [...new Set(loaderData.members.map((m) => m.grade))].sort((a, b) => b - a)
  const groups = grades
    .map((grade) => ({ grade, members: members.filter((m) => m.grade === grade) }))
    .filter((group) => group.members.length > 0)

  return (
    <>
      <PageHeader title="メンバー" description={`EDTCのメンバー ${loaderData.members.length}人。プロフィールから気になる人を探してみましょう。`} />
      <MemberFilters filter={filter} grades={grades} />
      {groups.length === 0 ? (
        <EmptyState icon={<UsersIcon size={32} />} title="該当するメンバーがいません" />
      ) : (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xl' })}>
          {groups.map((group) => (
            <section key={group.grade}>
              <h2 className={css({ fontSize: 'md', fontWeight: '700', mb: 'sm' })}>
                {group.grade}年生 <span className={css({ fontSize: 'sm', color: 'fg.subtle', fontWeight: '500' })}>{group.members.length}人</span>
              </h2>
              <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'md' })}>
                {group.members.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
