import { CATEGORY_LABEL_MAX, CATEGORY_TONES, CATEGORY_TONE_LABELS, type CategoryTone } from '@edtc/shared'
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
import type { Route } from './+types/event-settings'

export const meta: Route.MetaFunction = () => [{ title: 'イベント設定 | EDTC ダッシュボード' }]

export async function clientLoader() {
  return unwrap(api.events.categories.$get())
}

/** 編集画面から { categories: [{ id?, label, tone }] } が JSON で送られてくる。上から順に並べて一括で保存する */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const { categories } = (await request.json()) as { categories: { id?: string; label: string; tone: CategoryTone }[] }
  const result = await catchApiError(() => unwrap(api.events.categories.$put({ json: { categories } })))
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function EventSettingsPage({ loaderData }: Route.ComponentProps) {
  const user = useCurrentUser()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <EventSettingsView categories={loaderData.categories} />
}

type Category = { id: string; label: string; tone: CategoryTone }

function EventSettingsView({ categories }: { categories: Category[] }) {
  const [dirty, setDirty] = useState(false)
  const blocker = useUnsavedGuard(dirty)

  return (
    <>
      <PageHeader
        title="イベント設定"
        description="イベントを作るときに選ぶ種類を管理します。変更は「保存」を押すとまとめて反映されます。名前を変えても、そのイベントはそのままです。使われている種類は削除できません。色はバッジとカレンダーに使われます。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '720px' })}>
        <UnsavedAlert blocker={blocker} />
        {/* 保存して一覧が変わったら編集中の状態を作り直す */}
        <ListEditor<{ tone: CategoryTone }>
          key={JSON.stringify(categories)}
          title="イベントの種類"
          saved={categories}
          noun="種類"
          labelMax={CATEGORY_LABEL_MAX}
          newRowExtra={{ tone: 'accent' }}
          minRows={1}
          toPayload={(rows) => ({
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
          onDirtyChange={setDirty}
        />
      </div>
    </>
  )
}
