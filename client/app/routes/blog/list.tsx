import { Form, redirect, useNavigation } from 'react-router'
import { css } from 'styled-system/css'
import { Button } from '~/components/ui/Button'
import { EmptyState } from '~/components/ui/EmptyState'
import { PenIcon, PlusIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { TabLinks } from '~/components/ui/Tabs'
import { PostList } from '~/features/blog/PostList'
import { api, unwrap } from '~/lib/api'
import { optionalText } from '~/lib/form'
import type { Route } from './+types/list'

export const meta: Route.MetaFunction = () => [{ title: 'ブログ | EDTC ダッシュボード' }]

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const scope = new URL(request.url).searchParams.get('scope') === 'mine' ? 'mine' : 'all'
  const { posts } = await unwrap(api.blog.posts.$get({ query: { scope } }))
  return { scope, posts }
}

/** 新しい下書きを作って編集画面へ（イベント詳細の「ブログを書く」からも使う） */
export async function clientAction({ request }: Route.ClientActionArgs) {
  const eventId = optionalText(await request.formData(), 'eventId')
  const { id } = await unwrap(api.blog.posts.$post({ json: eventId ? { eventId } : {} }))
  return redirect(`/blog/${id}`)
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function BlogPage({ loaderData }: Route.ComponentProps) {
  const { scope, posts } = loaderData
  const navigation = useNavigation()
  return (
    <>
      <PageHeader
        title="ブログ"
        description="活動のレポートを書いて、サイト（EDTCHP）に公開しましょう。提出するとレビュー用のPRが自動で作られます。"
        actions={
          <Form method="post">
            <Button type="submit" variant="primary" loading={navigation.state === 'submitting'}>
              <PlusIcon size={16} />
              新しい記事を書く
            </Button>
          </Form>
        }
      />
      <div className={css({ mb: 'lg' })}>
        <TabLinks
          items={[
            { to: '?', label: 'みんなの記事', active: scope === 'all' },
            { to: '?scope=mine', label: '自分の記事', active: scope === 'mine' },
          ]}
        />
      </div>
      {posts.length === 0 ? (
        <EmptyState icon={<PenIcon size={32} />} title="記事はまだありません">
          イベントのページにある「ブログを書く」からも始められます
        </EmptyState>
      ) : (
        <PostList posts={posts} />
      )}
    </>
  )
}
