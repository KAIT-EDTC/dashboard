import { Form, Navigate, useNavigation } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { TextField } from '~/components/ui/Field'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, SaveIcon, TrashIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { api, unwrap } from '~/lib/api'
import { catchApiError, text, type FormErrors } from '~/lib/form'
import type { Route } from './+types/blog-tags'

export const meta: Route.MetaFunction = () => [{ title: 'ブログのタグ管理 | EDTC ダッシュボード' }]

export async function clientLoader() {
  return unwrap(api.blog.tags.$get())
}

/** フォームの intent（add / rename / move / delete）に応じてタグを更新する */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const form = await request.formData()
  const intent = text(form, 'intent')
  const param = { id: text(form, 'id') }

  const result = await catchApiError(async () => {
    if (intent === 'add') return unwrap(api.blog.tags.$post({ json: { label: text(form, 'label') } }))
    if (intent === 'rename') return unwrap(api.blog.tags[':id'].$patch({ param, json: { label: text(form, 'label') } }))
    if (intent === 'delete') return unwrap(api.blog.tags[':id'].$delete({ param }))
    if (intent === 'move') {
      const { tags } = await unwrap(api.blog.tags.$get())
      const ids = tags.map((tag) => tag.id)
      const from = ids.indexOf(param.id)
      const to = from + (text(form, 'direction') === 'up' ? -1 : 1)
      if (from < 0 || to < 0 || to >= ids.length) return { ok: true }
      ;[ids[from], ids[to]] = [ids[to], ids[from]]
      return unwrap(api.blog.tags.order.$put({ json: { ids } }))
    }
    return { ok: true }
  })
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function BlogTagsPage({ loaderData, actionData }: Route.ComponentProps) {
  const user = useCurrentUser()
  const navigation = useNavigation()
  const busy = navigation.state === 'submitting'
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const { tags } = loaderData
  const error = actionData && 'error' in actionData ? actionData.error : undefined
  return (
    <>
      <PageHeader
        title="ブログのタグ管理"
        description="記事に付けられるタグを管理します。名前を変えると、そのタグを付けている記事も新しい名前になります（公開済みの記事は再提出で反映されます）。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '640px' })}>
        {error && <Alert>{error}</Alert>}
        <Card title="タグを追加">
          <Form method="post" className={css({ display: 'flex', alignItems: 'flex-end', gap: 'sm' })}>
            <input type="hidden" name="intent" value="add" />
            <TextField label="タグ名" name="label" required maxLength={30} className={css({ flex: 1 })} />
            <Button type="submit" variant="primary" disabled={busy}>
              <PlusIcon size={16} />
              追加
            </Button>
          </Form>
        </Card>
        <Card title="タグ一覧">
          <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
            {tags.map((tag, index) => (
              <li key={tag.id} className={css({ display: 'flex', alignItems: 'flex-end', gap: 'xs' })}>
                <Form method="post" className={css({ display: 'flex', alignItems: 'flex-end', gap: 'xs', flex: 1 })}>
                  <input type="hidden" name="intent" value="rename" />
                  <input type="hidden" name="id" value={tag.id} />
                  <TextField
                    key={tag.label}
                    label={index === 0 ? '表示名' : <span className={css({ srOnly: true })}>表示名</span>}
                    name="label"
                    defaultValue={tag.label}
                    required
                    maxLength={30}
                    className={css({ flex: 1 })}
                  />
                  <Button type="submit" variant="secondary" disabled={busy} aria-label={`${tag.label}の名前を保存`}>
                    <SaveIcon size={16} />
                  </Button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="move" />
                  <input type="hidden" name="id" value={tag.id} />
                  <Button type="submit" name="direction" value="up" variant="ghost" disabled={busy || index === 0} aria-label={`${tag.label}を上へ`}>
                    <ArrowUpIcon size={16} />
                  </Button>
                  <Button type="submit" name="direction" value="down" variant="ghost" disabled={busy || index === tags.length - 1} aria-label={`${tag.label}を下へ`}>
                    <ArrowDownIcon size={16} />
                  </Button>
                </Form>
                <Form method="post" onSubmit={(e) => !confirm(`タグ「${tag.label}」を削除しますか？`) && e.preventDefault()}>
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={tag.id} />
                  <Button type="submit" variant="danger" disabled={busy} aria-label={`${tag.label}を削除`}>
                    <TrashIcon size={16} />
                  </Button>
                </Form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
