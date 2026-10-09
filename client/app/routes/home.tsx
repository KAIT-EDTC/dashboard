import { isLeader } from '@edtc/shared'
import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { ButtonLink } from '~/components/ui/Button'
import { EditIcon } from '~/components/ui/Icons'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MyPostsCard } from '~/features/blog/MyPostsCard'
import { MyItemsCard, UpcomingEventsCard } from '~/features/events/HomeCards'
import { MemberBadges } from '~/features/members/MemberBadges'
import { HomeReportsCard, HomeReviewCard } from '~/features/reports/HomeReportsCard'
import { api, unwrap } from '~/lib/api'
import type { Route } from './+types/home'

export const meta: Route.MetaFunction = () => [{ title: 'ホーム | EDTC ダッシュボード' }]

export async function clientLoader() {
  // 承認待ちは承認する立場でなければ空
  const [{ events }, { items }, { posts }, { targets, summaries }, { reports: review }] = await Promise.all([
    unwrap(api.events.$get({ query: { scope: 'upcoming' } })),
    unwrap(api.events['my-items'].$get()),
    unwrap(api.blog.posts.$get({ query: { scope: 'mine' } })),
    unwrap(api.reports.targets.$get()),
    unwrap(api.reports.review.$get()),
  ])
  return { events, items, posts, targets, summaries, review }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const me = useCurrentUser()
  const needsProfile = !me.headline && !me.bio

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
      <section className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'lg', pb: 'lg', borderBottomWidth: '1px' })}>
        <Avatar user={me} size={64} />
        <div className={css({ flex: 1, minW: '200px', display: 'flex', flexDirection: 'column', gap: 'xs' })}>
          <h1 className={css({ fontSize: '2xl', fontWeight: '700' })}>
            こんにちは、{me.nickname || me.firstName}さん
          </h1>
          <MemberBadges member={me} />
        </div>
        {needsProfile ? (
          <ButtonLink to="/profile" variant="primary">
            <EditIcon size={16} />
            自己紹介を書く
          </ButtonLink>
        ) : (
          <Link to={`/members/${me.id}`} className={css({ fontSize: 'sm' })}>
            自分のプロフィールを見る
          </Link>
        )}
      </section>

      <div className={css({ display: 'grid', gridTemplateColumns: { base: 'minmax(0, 1fr)', lg: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
        <UpcomingEventsCard events={loaderData.events} />
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <HomeReportsCard targets={loaderData.targets} summaries={loaderData.summaries} />
          {isLeader(me) && <HomeReviewCard reports={loaderData.review} />}
          <MyItemsCard items={loaderData.items} />
          <MyPostsCard posts={loaderData.posts} />
        </div>
      </div>
    </div>
  )
}
