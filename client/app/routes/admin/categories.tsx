import {
  CATEGORY_LABEL_MAX,
  CATEGORY_TONES,
  CATEGORY_TONE_LABELS,
  SERIES_ID_PATTERN,
  SERIES_LABEL_MAX,
  type CategoryTone,
} from '@edtc/shared'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { css } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'
import { inputStyle } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { ListEditor, UnsavedAlert, useUnsavedGuard } from '~/features/admin/ListEditor'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import type { Route } from './+types/categories'

export const meta: Route.MetaFunction = () => [{ title: '種類・種別の管理 | EDTC ダッシュボード' }]

export async function clientLoader() {
  const [{ categories }, { series }] = await Promise.all([unwrap(api.events.categories.$get()), unwrap(api.blog.series.$get())])
  return { categories, series }
}

type Payload =
  | { kind: 'categories'; categories: { id?: string; label: string; tone: CategoryTone }[] }
  | { kind: 'series'; series: { id: string; label: string }[] }

/** 編集画面から、種類・種別それぞれの一覧が JSON で送られてくる（kind で見分ける） */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const payload = (await request.json()) as Payload
  const result = await catchApiError(() =>
    payload.kind === 'categories'
      ? unwrap(api.events.categories.$put({ json: { categories: payload.categories } }))
      : unwrap(api.blog.series.$put({ json: { series: payload.series } })),
  )
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function CategoriesPage({ loaderData }: Route.ComponentProps) {
  const user = useCurrentUser()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <CategoriesView categories={loaderData.categories} series={loaderData.series} />
}

type Category = { id: string; label: string; tone: CategoryTone }

function CategoriesView({ categories, series }: { categories: Category[]; series: { id: string; label: string }[] }) {
  const [dirty, setDirty] = useState({ categories: false, series: false })
  const blocker = useUnsavedGuard(dirty.categories || dirty.series)
  // 種別は、追加した行でだけIDを入力する。保存済みの行のIDは変えられない
  const savedSeries = series.map((item) => ({ ...item, newId: '' }))

  return (
    <>
      <PageHeader
        title="種類・種別の管理"
        description="イベントの種類と、ブログのイベント種別を管理します。それぞれ「保存」を押すとまとめて反映されます。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xl', maxW: '720px' })}>
        <UnsavedAlert blocker={blocker} />

        <section className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
            イベントを作るときに選ぶ種類です。名前を変えても、そのイベントはそのままです。使われている種類は削除できません。色はバッジとカレンダーに使われます。
          </p>
          <ListEditor<{ tone: CategoryTone }>
            key={JSON.stringify(categories)}
            title="イベントの種類"
            saved={categories}
            noun="種類"
            labelMax={CATEGORY_LABEL_MAX}
            newRowExtra={{ tone: 'accent' }}
            minRows={1}
            toPayload={(rows) => ({
              kind: 'categories',
              categories: rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), label: row.label, tone: row.tone })),
            })}
            renderExtra={(row, patch) => (
              <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs' })}>
                <Badge tone={row.tone}>{row.label || '見本'}</Badge>
                <select
                  aria-label={`${row.label || '新しい種類'}の色`}
                  value={row.tone}
                  onChange={(e) => patch({ tone: e.currentTarget.value as CategoryTone })}
                  className={css({ w: '72px' }) + ' ' + inputStyle}
                >
                  {CATEGORY_TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {CATEGORY_TONE_LABELS[tone]}
                    </option>
                  ))}
                </select>
              </span>
            )}
            onDirtyChange={(value) => setDirty((prev) => ({ ...prev, categories: value }))}
          />
        </section>

        <section className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
            ブログ記事のイベント種別です。IDは記事ID（例: <code>26-10-17-yugyou</code>）と、サイト側の記事フォルダ名の一部になるので、
            <strong>作成後は変えられません</strong>。名前だけ変えられます。記事で使われている種別は削除できません。
          </p>
          <ListEditor<{ newId: string }>
            key={JSON.stringify(series)}
            title="ブログのイベント種別"
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
      </div>
    </>
  )
}
