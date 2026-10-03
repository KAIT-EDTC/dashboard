import { SERIES_ID_PATTERN, SERIES_LABEL_MAX, TAG_LABEL_MAX } from '@edtc/shared'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { css } from 'styled-system/css'
import { inputStyle } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { ListEditor, UnsavedAlert, useUnsavedGuard } from '~/features/admin/ListEditor'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import type { Route } from './+types/blog-settings'

export const meta: Route.MetaFunction = () => [{ title: 'ブログ設定 | EDTC ダッシュボード' }]

export async function clientLoader() {
  const [{ series }, { tags }] = await Promise.all([unwrap(api.blog.series.$get()), unwrap(api.blog.tags.$get())])
  return { series, tags }
}

type Payload =
  | { kind: 'series'; series: { id: string; label: string }[] }
  | { kind: 'tags'; tags: { id?: string; label: string }[] }

/** 編集画面から、種別・タグそれぞれの一覧が JSON で送られてくる（kind で見分ける） */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const payload = (await request.json()) as Payload
  const result = await catchApiError(() =>
    payload.kind === 'series'
      ? unwrap(api.blog.series.$put({ json: { series: payload.series } }))
      : unwrap(api.blog.tags.$put({ json: { tags: payload.tags } })),
  )
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function BlogSettingsPage({ loaderData }: Route.ComponentProps) {
  const user = useCurrentUser()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <BlogSettingsView series={loaderData.series} tags={loaderData.tags} />
}

type Item = { id: string; label: string }

function BlogSettingsView({ series, tags }: { series: Item[]; tags: Item[] }) {
  const [dirty, setDirty] = useState({ series: false, tags: false })
  const blocker = useUnsavedGuard(dirty.series || dirty.tags)
  // 種別は、追加した行でだけIDを入力する。保存済みの行のIDは変えられない
  const savedSeries = series.map((item) => ({ ...item, newId: '' }))

  return (
    <>
      <PageHeader
        title="ブログ設定"
        description="ブログ記事のイベント種別とタグを管理します。それぞれ「保存」を押すとまとめて反映されます。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xl', maxW: '720px' })}>
        <UnsavedAlert blocker={blocker} />

        <section className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
            ブログ記事のイベント種別です。IDは記事ID（例: <code>26-10-17-yugyou</code>）と、サイト側の記事フォルダ名の一部になるので、
            <strong>作成後は変えられません</strong>。名前だけ変えられます。記事で使われている種別は削除できません。
          </p>
          <ListEditor<{ newId: string }>
            key={JSON.stringify(series)}
            title="イベント種別"
            saved={savedSeries}
            noun="種別"
            labelMax={SERIES_LABEL_MAX}
            newRowExtra={{ newId: '' }}
            minRows={1}
            toPayload={(rows) => ({ kind: 'series', series: rows.map((row) => ({ id: row.id ?? row.newId.trim(), label: row.label })) })}
            rowError={(row, rows) => {
              if (row.id) return undefined
              const id = row.newId.trim()
              if (!SERIES_ID_PATTERN.test(id)) return 'IDは半角英小文字で始まる、英小文字と数字の2〜20文字にしてください（例: workshop）'
              if (rows.filter((other) => (other.id ?? other.newId.trim()) === id).length > 1) return `同じIDの種別があります: ${id}`
              return undefined
            }}
            renderExtra={(row, patch) =>
              row.id ? (
                <code className={css({ fontSize: 'xs', color: 'fg.subtle', flexShrink: 0 })}>{row.id}</code>
              ) : (
                <input
                  aria-label="ID（作成後は変えられません）"
                  value={row.newId}
                  onChange={(e) => patch({ newId: e.currentTarget.value })}
                  placeholder="ID（英小文字）"
                  maxLength={20}
                  className={css({ w: '150px' }) + ' ' + inputStyle}
                />
              )
            }
            onDirtyChange={(value) => setDirty((prev) => ({ ...prev, series: value }))}
          />
        </section>

        <section className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
            記事に付けられるタグです。名前を変えると、そのタグを付けている記事も新しい名前になります（公開済みの記事は再提出で反映されます）。使われているタグは削除できません。
          </p>
          <ListEditor
            key={JSON.stringify(tags)}
            title="タグ"
            saved={tags}
            noun="タグ"
            labelMax={TAG_LABEL_MAX}
            newRowExtra={{}}
            toPayload={(rows) => ({ kind: 'tags', tags: rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), label: row.label })) })}
            onDirtyChange={(value) => setDirty((prev) => ({ ...prev, tags: value }))}
          />
        </section>
      </div>
    </>
  )
}
