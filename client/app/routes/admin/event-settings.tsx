import { CATEGORY_LABEL_MAX, CATEGORY_TONES, CATEGORY_TONE_LABELS, type CategoryTone } from '@edtc/shared'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { css } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'
import { Checkbox, inputStyleRaw } from '~/components/ui/Field'
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

/** 編集画面から { categories: [{ id?, label, tone, hasLecturer, hasReport, hasLightReport }] } が JSON で送られてくる。上から順に並べて一括で保存する */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const { categories } = (await request.json()) as { categories: ({ id?: string; label: string } & CategoryRules)[] }
  const result = await catchApiError(() => unwrap(api.events.categories.$put({ json: { categories } })))
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function EventSettingsPage({ loaderData }: Route.ComponentProps) {
  const user = useCurrentUser()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <EventSettingsView categories={loaderData.categories} />
}

/** 名前以外の、種類ごとの設定 */
type CategoryRules = { tone: CategoryTone; hasLecturer: boolean; hasReport: boolean; hasLightReport: boolean }
type Category = { id: string; label: string } & CategoryRules

function EventSettingsView({ categories }: { categories: Category[] }) {
  const [dirty, setDirty] = useState(false)
  const blocker = useUnsavedGuard(dirty)

  return (
    <>
      <PageHeader
        title="イベント設定"
        description="イベントを作るときに選ぶ種類を管理します。変更は「保存」を押すとまとめて反映されます。名前を変えても、そのイベントはそのままです。使われている種類は削除できません。色はバッジとカレンダーに使われます。講師を置かない種類のイベントは、講師・講師補助の役割がなく、まとめ報告書の担当者を参加者から指名します。報告書なしの種類のイベントは、活動報告書・まとめ報告書を書きません。簡易報告書ありの種類のイベントは、参加者が事後報告だけを書きます（文字数の上限・承認なし。書くとすぐイベントページに名前付きで載ります）。報告書と簡易報告書はどちらか一方だけ選べます。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '820px' })}>
        <UnsavedAlert blocker={blocker} />
        {/* 保存して一覧が変わったら編集中の状態を作り直す */}
        <ListEditor<CategoryRules>
          key={JSON.stringify(categories)}
          title="イベントの種類"
          saved={categories}
          noun="種類"
          labelMax={CATEGORY_LABEL_MAX}
          newRowExtra={{ tone: 'accent', hasLecturer: true, hasReport: true, hasLightReport: false }}
          minRows={1}
          toPayload={(rows) => ({
            categories: rows.map((row) => ({
              ...(row.id ? { id: row.id } : {}),
              label: row.label,
              tone: row.tone,
              hasLecturer: row.hasLecturer,
              hasReport: row.hasReport,
              hasLightReport: row.hasLightReport,
            })),
          })}
          renderExtra={(row, patch) => (
            <span className={css({ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 'xs' })}>
              <Badge tone={row.tone}>{row.label || '見本'}</Badge>
              <select
                aria-label={`${row.label || '新しい種類'}の色`}
                value={row.tone}
                onChange={(e) => patch({ tone: e.currentTarget.value as CategoryTone })}
                className={css(inputStyleRaw, { w: '72px' })}
              >
                {CATEGORY_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {CATEGORY_TONE_LABELS[tone]}
                  </option>
                ))}
              </select>
              <Checkbox label="講師あり" checked={row.hasLecturer} onChange={(e) => patch({ hasLecturer: e.currentTarget.checked })} />
              {/* 報告書と簡易報告書はどちらか一方。片方を付けたらもう片方を外す */}
              <Checkbox
                label="報告書あり"
                checked={row.hasReport}
                onChange={(e) => patch({ hasReport: e.currentTarget.checked, ...(e.currentTarget.checked && { hasLightReport: false }) })}
              />
              <Checkbox
                label="簡易報告書あり"
                checked={row.hasLightReport}
                onChange={(e) => patch({ hasLightReport: e.currentTarget.checked, ...(e.currentTarget.checked && { hasReport: false }) })}
              />
            </span>
          )}
          onDirtyChange={setDirty}
        />
      </div>
    </>
  )
}
