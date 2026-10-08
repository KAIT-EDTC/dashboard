import { useEffect, useEffectEvent, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useBlocker, useFetcher, type Blocker, type SubmitTarget } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { TextField } from '~/components/ui/Field'
import { GripIcon, PlusIcon, SaveIcon, TrashIcon } from '~/components/ui/Icons'
import type { FormErrors } from '~/lib/form'

/** 編集中の1行。id がなければ新規。key は並べ替え・編集のあいだ行を識別する。E は行ごとの追加項目 */
export type EditorRow<E extends object = object> = { key: string; id?: string; label: string } & E

type SavedItem<E extends object> = { id: string; label: string } & E

type Props<E extends object> = {
  title: string
  /** 保存済みの一覧（上から順） */
  saved: SavedItem<E>[]
  /** 「○○を追加」「同じ名前の○○があります」などの○○ */
  noun: string
  labelMax: number
  /** 追加した行の、追加項目の初期値 */
  newRowExtra: E
  /** 保存するときに action へ送る JSON。action 側で種類を見分けられる形にする */
  toPayload: (rows: EditorRow<E>[]) => Extract<SubmitTarget, Record<string, unknown>>
  /** 行ごとの追加項目（色の選択など）。patch で行を更新する */
  renderExtra?: (row: EditorRow<E>, patch: (changes: Partial<E>) => void) => ReactNode
  /** 行の入力の誤り。あれば保存できない */
  rowError?: (row: EditorRow<E>, rows: EditorRow<E>[]) => string | undefined
  /** 残す必要がある最低件数（これ以下になる削除はできない） */
  minRows?: number
  /** 編集中の変更があるかが変わるたびに呼ばれる（未保存のまま離れる警告に使う） */
  onDirtyChange?: (dirty: boolean) => void
}

const toRows = <E extends object>(saved: SavedItem<E>[]): EditorRow<E>[] => saved.map((item) => ({ ...item, key: item.id }))
/** 並べ替え用の key を除いた内容。編集前後の比較に使う */
const signature = (rows: { key?: string }[]) =>
  JSON.stringify(rows.map((row) => Object.fromEntries(Object.entries(row).filter(([name]) => name !== 'key'))))

/** 未保存のまま別のページへ移ろうとしたら止める（ブラウザのタブを閉じる場合も警告する） */
export function useUnsavedGuard(dirty: boolean): Blocker {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  return blocker
}

export function UnsavedAlert({ blocker }: { blocker: Blocker }) {
  if (blocker.state !== 'blocked') return null
  return (
    <Alert tone="warning">
      保存していない変更があります。
      <span className={css({ display: 'inline-flex', gap: 'sm', ml: 'md' })}>
        <Button size="sm" onClick={() => blocker.reset()}>編集に戻る</Button>
        <Button size="sm" variant="danger" onClick={() => blocker.proceed()}>破棄して移動</Button>
      </span>
    </Alert>
  )
}

/**
 * 名前の一覧を、追加・名前変更・ドラッグでの並べ替え・削除して、まとめて保存する編集画面。
 * 保存すると action に toPayload() の JSON が送られる。保存後は loader で saved が変わるので、
 * 呼び出し側で key={JSON.stringify(saved)} を付けて作り直す
 */
export function ListEditor<E extends object = object>({
  title,
  saved,
  noun,
  labelMax,
  newRowExtra,
  toPayload,
  renderExtra,
  rowError,
  minRows = 0,
  onDirtyChange,
}: Props<E>) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const [rows, setRows] = useState<EditorRow<E>[]>(() => toRows(saved))
  const [newLabel, setNewLabel] = useState('')
  const [dragKey, setDragKey] = useState<string | null>(null)

  const saving = fetcher.state !== 'idle'
  const dirty = signature(rows) !== signature(toRows(saved))
  const labels = rows.map((row) => row.label.trim())
  const duplicated = labels.find((label, index) => label && labels.indexOf(label) !== index)
  const rowErrors = rows.map((row) => rowError?.(row, rows))
  const invalid = labels.some((label) => !label) || !!duplicated || rowErrors.some(Boolean)
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  // 呼び出し側が毎回新しい関数を渡しても、dirty が変わったときだけ知らせる（依存に入れると無限ループになる）
  const notifyDirty = useEffectEvent((value: boolean) => onDirtyChange?.(value))
  useEffect(() => notifyDirty(dirty), [dirty])

  const move = (key: string, to: number) =>
    setRows((prev) => {
      const from = prev.findIndex((row) => row.key === key)
      if (from < 0 || to < 0 || to >= prev.length || from === to) return prev
      const next = [...prev]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })

  const patchRow = (key: string, changes: Partial<EditorRow<E>>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...changes } : row)))

  const add = () => {
    const label = newLabel.trim()
    if (!label || rows.some((row) => row.label.trim() === label)) return
    setRows((prev) => [...prev, { key: crypto.randomUUID(), label, ...newRowExtra } as EditorRow<E>])
    setNewLabel('')
  }

  const save = () => {
    const trimmed = rows.map((row) => ({ ...row, label: row.label.trim() }))
    fetcher.submit(toPayload(trimmed), { method: 'post', encType: 'application/json' })
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
      {error && <Alert>{error}</Alert>}
      {duplicated && <Alert tone="warning">同じ名前の{noun}があります: {duplicated}</Alert>}

      <Card
        title={title}
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
            label={`${noun}を追加`}
            value={newLabel}
            onChange={(e) => setNewLabel(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                add()
              }
            }}
            maxLength={labelMax}
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
                flexWrap: 'wrap',
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
                aria-label={`${row.label || `新しい${noun}`}を並べ替え（ドラッグ、または上下キー）`}
                className={css({ display: 'inline-flex', p: 'xs', color: 'fg.subtle', cursor: 'grab', borderRadius: 'sm', _hover: { color: 'fg' }, _active: { cursor: 'grabbing' }, _focusVisible: { outline: 'none', shadow: 'focus' } })}
              >
                <GripIcon size={18} />
              </button>
              <TextField
                label={<span className={css({ srOnly: true })}>{noun}の名前</span>}
                value={row.label}
                onChange={(e) => patchRow(row.key, { label: e.currentTarget.value } as Partial<EditorRow<E>>)}
                maxLength={labelMax}
                className={css({ flex: 1, minW: '140px' })}
              />
              {renderExtra?.(row, (changes) => patchRow(row.key, changes as Partial<EditorRow<E>>))}
              {!row.id && <span className={css({ fontSize: 'xs', color: 'accent.fg', flexShrink: 0 })}>新規</span>}
              <Button
                variant="ghost"
                disabled={rows.length <= minRows}
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                aria-label={`${row.label || `新しい${noun}`}を削除`}
              >
                <TrashIcon size={16} />
              </Button>
              {rowErrors[index] && <p className={css({ w: 'full', pl: '36px', fontSize: 'xs', color: 'danger.fg' })}>{rowErrors[index]}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
