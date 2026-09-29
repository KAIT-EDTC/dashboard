import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { ButtonLink } from '~/components/ui/Button'
import { EditIcon } from '~/components/ui/Icons'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MyPostsCard } from '~/features/blog/MyPostsCard'
import { MyItemsCard, UpcomingEventsCard } from '~/features/events/HomeCards'
import { MemberBadges } from '~/features/members/MemberBadges'
import { api, unwrap } from '~/lib/api'
import type { Route } from './+types/home'

export const meta: Route.MetaFunction = () => [{ title: 'ホーム | EDTC ダッシュボード' }]

export async function clientLoader() {
  const [{ events }, { items }, { posts }] = await Promise.all([
    unwrap(api.events.$get({ query: { scope: 'upcoming' } })),
    unwrap(api.events['my-items'].$get()),
    unwrap(api.blog.posts.$get({ query: { scope: 'mine' } })),
  ])
  return { events, items, posts }
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

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '3fr 2fr' }, gap: 'lg', alignItems: 'start' })}>
        <UpcomingEventsCard events={loaderData.events} />
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <MyItemsCard items={loaderData.items} />
          <MyPostsCard posts={loaderData.posts} />
        </div>
      </div>
    </div>
  )
}
