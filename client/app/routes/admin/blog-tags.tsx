import { TAG_LABEL_MAX } from '@edtc/shared'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { css } from 'styled-system/css'
import { PageHeader } from '~/components/ui/PageHeader'
import { ListEditor, UnsavedAlert, useUnsavedGuard } from '~/features/admin/ListEditor'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import type { Route } from './+types/blog-tags'

export const meta: Route.MetaFunction = () => [{ title: 'ブログのタグ管理 | EDTC ダッシュボード' }]

export async function clientLoader() {
  return unwrap(api.blog.tags.$get())
}

/** 編集画面から { tags: [{ id?, label }] } が JSON で送られてくる。上から順に並べて一括で保存する */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const { tags } = (await request.json()) as { tags: { id?: string; label: string }[] }
  const result = await catchApiError(() => unwrap(api.blog.tags.$put({ json: { tags } })))
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function BlogTagsPage({ loaderData }: Route.ComponentProps) {
  const user = useCurrentUser()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <TagsView tags={loaderData.tags} />
}

function TagsView({ tags }: { tags: { id: string; label: string }[] }) {
  const [dirty, setDirty] = useState(false)
  const blocker = useUnsavedGuard(dirty)
  return (
    <>
      <PageHeader
        title="ブログのタグ管理"
        description="記事に付けられるタグを管理します。変更は「保存」を押すとまとめて反映されます。名前を変えると、そのタグを付けている記事も新しい名前になります（公開済みの記事は再提出で反映されます）。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '640px' })}>
        <UnsavedAlert blocker={blocker} />
        {/* 保存して一覧が変わったら編集中の状態を作り直す */}
        <ListEditor
          key={JSON.stringify(tags)}
          title="タグ一覧"
          saved={tags}
          noun="タグ"
          labelMax={TAG_LABEL_MAX}
          newRowExtra={{}}
          toPayload={(rows) => ({ tags: rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), label: row.label })) })}
          onDirtyChange={setDirty}
        />
      </div>
    </>
  )
}
