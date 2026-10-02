import { TAG_LABEL_MAX } from '@edtc/shared'
import { useEffect, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Navigate, useBlocker, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { TextField } from '~/components/ui/Field'
import { GripIcon, PlusIcon, SaveIcon, TrashIcon } from '~/components/ui/Icons'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import type { Route } from './+types/blog-tags'

export const meta: Route.MetaFunction = () => [{ title: 'ブログのタグ管理 | EDTC ダッシュボード' }]

type SavedTag = { id: string; label: string }
/** 編集中の1行。id がなければ新規。key は並べ替え・編集のあいだ行を識別する */
type Row = { key: string; id?: string; label: string }

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
  // 保存して一覧が変わったら編集中の状態を作り直す
  return <TagEditor key={JSON.stringify(loaderData.tags)} saved={loaderData.tags} />
}

const toRows = (tags: SavedTag[]): Row[] => tags.map((tag) => ({ key: tag.id, id: tag.id, label: tag.label }))
const signature = (rows: { id?: string; label: string }[]) => JSON.stringify(rows.map((row) => [row.id ?? null, row.label]))

function TagEditor({ saved }: { saved: SavedTag[] }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const [rows, setRows] = useState<Row[]>(() => toRows(saved))
  const [newLabel, setNewLabel] = useState('')
  const [dragKey, setDragKey] = useState<string | null>(null)

  const saving = fetcher.state !== 'idle'
  const dirty = signature(rows) !== signature(saved)
  const labels = rows.map((row) => row.label.trim())
  const duplicated = labels.find((label, index) => label && labels.indexOf(label) !== index)
  const invalid = labels.some((label) => !label) || !!duplicated
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  // 未保存のまま離れようとしたら確認する
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const move = (key: string, to: number) =>
    setRows((prev) => {
      const from = prev.findIndex((row) => row.key === key)
      if (from < 0 || to < 0 || to >= prev.length || from === to) return prev
      const next = [...prev]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })

  const add = () => {
    const label = newLabel.trim()
    if (!label || rows.some((row) => row.label.trim() === label)) return
    setRows((prev) => [...prev, { key: crypto.randomUUID(), label }])
    setNewLabel('')
  }

  const save = () => {
    const tags = rows.map((row): Record<string, string> => ({ ...(row.id ? { id: row.id } : {}), label: row.label.trim() }))
    fetcher.submit({ tags }, { method: 'post', encType: 'application/json' })
  }

  const onDragStart = (e: DragEvent<HTMLButtonElement>, key: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', key)
    const row = e.currentTarget.closest('li')
    if (row) e.dataTransfer.setDragImage(row, 16, 16)
    setDragKey(key)
  }
  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>, key: string, index: number) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    move(key, index + (e.key === 'ArrowUp' ? -1 : 1))
  }

  return (
    <>
      <PageHeader
        title="ブログのタグ管理"
        description="記事に付けられるタグを管理します。変更は「保存」を押すとまとめて反映されます。名前を変えると、そのタグを付けている記事も新しい名前になります（公開済みの記事は再提出で反映されます）。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '640px' })}>
        {blocker.state === 'blocked' && (
          <Alert tone="warning">
            保存していない変更があります。
            <span className={css({ display: 'inline-flex', gap: 'sm', ml: 'md' })}>
              <Button size="sm" onClick={() => blocker.reset()}>編集に戻る</Button>
              <Button size="sm" variant="danger" onClick={() => blocker.proceed()}>破棄して移動</Button>
            </span>
          </Alert>
        )}
        {error && <Alert>{error}</Alert>}
        {duplicated && <Alert tone="warning">同じ名前のタグがあります: {duplicated}</Alert>}

        <Card
          title="タグ一覧"
          action={
            <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
              <span className={css({ fontSize: 'xs', color: dirty ? 'warning.fg' : 'fg.subtle' })}>{dirty ? '未保存の変更があります' : '保存済み'}</span>
              <Button variant="ghost" size="sm" onClick={() => setRows(toRows(saved))} disabled={!dirty || saving}>
                元に戻す
              </Button>
              <Button variant="primary" size="sm" onClick={save} loading={saving} disabled={!dirty || invalid}>
                <SaveIcon size={14} />
                保存
              </Button>
            </span>
          }
        >
          <div className={css({ display: 'flex', alignItems: 'flex-end', gap: 'sm', mb: 'md' })}>
            <TextField
              label="タグを追加"
              value={newLabel}
              onChange={(e) => setNewLabel(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  add()
                }
              }}
              maxLength={TAG_LABEL_MAX}
              className={css({ flex: 1 })}
            />
            <Button variant="secondary" onClick={add} disabled={!newLabel.trim()}>
              <PlusIcon size={16} />
              追加
            </Button>
          </div>
          <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
            {rows.map((row, index) => (
              <li
                key={row.key}
                onDragOver={(e) => dragKey && e.preventDefault()}
                onDragEnter={() => dragKey && dragKey !== row.key && move(dragKey, index)}
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'xs',
                  p: 'xs',
                  borderRadius: 'md',
                  borderWidth: '1px',
                  borderColor: 'border',
                  bg: 'surface',
                  opacity: dragKey === row.key ? 0.5 : 1,
                })}
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => onDragStart(e, row.key)}
                  onDragEnd={() => setDragKey(null)}
                  onKeyDown={(e) => onHandleKey(e, row.key, index)}
                  aria-label={`${row.label || '新しいタグ'}を並べ替え（ドラッグ、または上下キー）`}
                  className={css({ display: 'inline-flex', p: 'xs', color: 'fg.subtle', cursor: 'grab', borderRadius: 'sm', _hover: { color: 'fg' }, _active: { cursor: 'grabbing' }, _focusVisible: { outline: 'none', shadow: 'focus' } })}
                >
                  <GripIcon size={18} />
                </button>
                <TextField
                  label={<span className={css({ srOnly: true })}>タグ名</span>}
                  value={row.label}
                  onChange={(e) => {
                    const label = e.currentTarget.value
                    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, label } : r)))
                  }}
                  maxLength={TAG_LABEL_MAX}
                  className={css({ flex: 1 })}
                />
                {!row.id && <span className={css({ fontSize: 'xs', color: 'accent.fg', flexShrink: 0 })}>新規</span>}
                <Button variant="ghost" onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))} aria-label={`${row.label || '新しいタグ'}を削除`}>
                  <TrashIcon size={16} />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
