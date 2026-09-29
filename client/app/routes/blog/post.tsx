import { blogPostInputSchema } from '@edtc/shared'
import { redirect } from 'react-router'
import { css } from 'styled-system/css'
import { Card } from '~/components/ui/Card'
import { ExternalLinkIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { ArticlePreview } from '~/features/blog/ArticlePreview'
import { BlogEditor, type EditorActionData, type EditorIntent } from '~/features/blog/BlogEditor'
import { contentOf } from '~/features/blog/content'
import { PostStatusBadge } from '~/features/blog/PostStatusBadge'
import { api, unwrap } from '~/lib/api'
import { catchApiError, zodErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { Route } from './+types/post'

export const meta: Route.MetaFunction = ({ data }) => [{ title: `${data?.post.title || 'ブログ記事'} | EDTC ダッシュボード` }]

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return unwrap(api.blog.posts[':id'].$get({ param: { id: params.postId } }))
}

/** エディタから JSON で { intent, content } が送られてくる */
export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionData | Response> {
  const { intent, content } = (await request.json()) as { intent: EditorIntent; content?: unknown }
  const param = { id: params.postId }

  if (intent === 'delete') {
    const result = await catchApiError(() => unwrap(api.blog.posts[':id'].$delete({ param })))
    return result.errors ? { ...result.errors, intent } : redirect('/blog?scope=mine')
  }

  const parsed = blogPostInputSchema.safeParse(content)
  if (!parsed.success) return { ...zodErrors(parsed.error), intent }
  const saved = await catchApiError(() => unwrap(api.blog.posts[':id'].$put({ param, json: parsed.data })))
  if (saved.errors) return { ...saved.errors, intent }
  if (intent === 'save') return { ok: true, intent }

  const submitted = await catchApiError(() => unwrap(api.blog.posts[':id'].submit.$post({ param })))
  if (submitted.errors) return { ...submitted.errors, intent }
  return { ok: true, intent, prUrl: submitted.data.prUrl }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function BlogPostPage({ loaderData }: Route.ComponentProps) {
  const { post, canEdit } = loaderData
  return (
    <>
      <PageHeader
        title={post.title || '無題の記事'}
        description={
          <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
            <PostStatusBadge status={post.status} />
            執筆: {fullName(post.author)}
          </span>
        }
        back={{ to: '/blog', label: 'ブログ一覧' }}
      />
      {canEdit ? (
        <BlogEditor key={post.id} {...loaderData} />
      ) : (
        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '3fr 1fr' }, gap: 'lg', alignItems: 'start' })}>
          <Card title="記事">
            <ArticlePreview postId={post.id} content={contentOf(post)} />
          </Card>
          {post.prUrl && (
            <Card title="レビュー">
              <a href={post.prUrl} target="_blank" rel="noopener noreferrer" className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm' })}>
                <ExternalLinkIcon size={14} />
                GitHubでPRを見る
              </a>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
