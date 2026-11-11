import type { ItemKind } from '@edtc/shared'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Dialog } from '~/components/ui/Dialog'
import { Checkbox, SelectField, TextField } from '~/components/ui/Field'
import { EditIcon, PackageIcon, PlusIcon, TrashIcon } from '~/components/ui/Icons'
import { EmptyState } from '~/components/ui/EmptyState'
import type { FormErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { EventDetail, EventItem } from './types'

type Props = { event: EventDetail; userId: string; canManage: boolean }
type Participants = EventDetail['participants']

/** フォーム上の「持ってくる人」: all=参加者全員 / 空=未定 / それ以外=担当者の userId */
export function bringerToFields(bringer: string): { kind: ItemKind; assigneeId: string | null } {
  if (bringer === 'all') return { kind: 'personal', assigneeId: null }
  return { kind: 'shared', assigneeId: bringer || null }
}

const bringerOf = (item: EventItem) => (item.kind === 'personal' ? 'all' : (item.assigneeId ?? ''))

/** 未定 → 担当者あり → 参加者全員 の順に並べる（同順位は元の順序） */
const rank = (item: EventItem) => (item.kind === 'personal' ? 2 : item.assigneeId ? 1 : 0)

function BringerOptions({ candidates }: { candidates: Participants }) {
  return (
    <>
      <option value="all">参加者全員（それぞれ持ってくる）</option>
      <option value="">未定（参加者から募集）</option>
      {candidates.length > 0 && (
        <optgroup label="参加者">
          {candidates.map((p) => (
            <option key={p.userId} value={p.userId}>
              {fullName(p.user)}
            </option>
          ))}
        </optgroup>
      )}
    </>
  )
}

function ItemName({ item }: { item: EventItem }) {
  return (
    <>
      {item.name}
      {item.quantity > 1 && <span className={css({ color: 'fg.muted', fontWeight: '400' })}> ×{item.quantity}</span>}
    </>
  )
}

const rowStyle = css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm', py: 'sm', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })

function MyItemRow({ item }: { item: EventItem }) {
  const fetcher = useFetcher<FormErrors>()
  return (
    <li className={rowStyle}>
      <div className={css({ flex: 1, minW: '160px' })}>
        <p className={css({ fontWeight: '600', fontSize: 'sm' })}>
          <ItemName item={item} />
        </p>
        {item.note && <p className={css({ fontSize: 'xs', color: 'fg.muted' })}>{item.note}</p>}
        {fetcher.data?.error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{fetcher.data.error}</p>}
      </div>
      {item.kind === 'shared' && (
        <Checkbox
          label="準備OK"
          checked={item.prepared}
          disabled={fetcher.state !== 'idle'}
          onChange={(e) => fetcher.submit({ intent: 'update-item', itemId: item.id, prepared: String(e.currentTarget.checked) }, { method: 'post' })}
        />
      )}
    </li>
  )
}

function ItemRow({ item, userId, canManage, candidates }: { item: EventItem; userId: string; canManage: boolean; candidates: Participants }) {
  const fetcher = useFetcher<FormErrors>()
  const [editing, setEditing] = useState(false)
  const busy = fetcher.state !== 'idle'
  const submit = (fields: Record<string, string>) => fetcher.submit({ intent: 'update-item', itemId: item.id, ...fields }, { method: 'post' })
  const mine = item.assigneeId === userId
  const open = item.kind === 'shared' && !item.assigneeId
  // 参加を取り消した人が担当のままでも、選択肢から消えないようにする
  const options = item.assignee && !candidates.some((p) => p.userId === item.assigneeId) ? [...candidates, { userId: item.assigneeId, user: item.assignee } as Participants[number]] : candidates

  return (
    <li className={rowStyle}>
      <div className={css({ flex: 1, minW: '160px' })}>
        <p className={css({ fontWeight: '600', fontSize: 'sm' })}>
          <ItemName item={item} />
          {item.prepared && <span className={css({ ml: 'xs' })}><Badge tone="success">準備済み</Badge></span>}
        </p>
        {item.note && <p className={css({ fontSize: 'xs', color: 'fg.muted' })}>{item.note}</p>}
        {fetcher.data?.error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{fetcher.data.error}</p>}
      </div>

      {item.kind === 'personal' ? (
        <span className={css({ fontSize: 'sm' })}>参加者全員</span>
      ) : item.assignee ? (
        <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm' })}>
          <Avatar user={item.assignee} size={22} />
          {fullName(item.assignee)}
          {mine && '（あなた）'}
        </span>
      ) : (
        <Badge tone="warning">未定</Badge>
      )}
      {open && (
        <Button variant="primary" loading={busy} onClick={() => submit({ assigneeId: userId })}>
          自分が持っていく
        </Button>
      )}
      {mine && (
        <Button variant="ghost" loading={busy} onClick={() => submit({ assigneeId: '' })}>
          担当をやめる
        </Button>
      )}
      {canManage && (
        <>
          {item.assigneeId && <Checkbox label="準備OK" checked={item.prepared} disabled={busy} onChange={(e) => submit({ prepared: String(e.currentTarget.checked) })} />}
          <Button aria-label={`${item.name}を編集`} onClick={() => setEditing(true)}>
            <EditIcon size={16} />
            編集
          </Button>
          <Dialog open={editing} onClose={() => setEditing(false)} title="持ち物を編集">
            <ItemForm item={item} candidates={options} onDone={() => setEditing(false)} />
          </Dialog>
        </>
      )}
    </li>
  )
}

/** 追加と編集で共通のフォーム。item があれば編集（削除もここから） */
function ItemForm({ item, candidates, onDone }: { item?: EventItem; candidates: Participants; onDone: () => void }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const busy = fetcher.state !== 'idle'
  const deleting = busy && fetcher.formData?.get('intent') === 'delete-item'
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'ok' in fetcher.data) onDone()
  }, [fetcher.state, fetcher.data, onDone])
  const error = fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  return (
    <fetcher.Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
      <input type="hidden" name="intent" value={item ? 'update-item' : 'add-item'} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {error && <Alert>{error}</Alert>}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', sm: '2fr 1fr' }, gap: 'md' })}>
        <TextField label="持ち物" name="name" required placeholder="例: はんだごて" defaultValue={item?.name} />
        <TextField label="数量" name="quantity" type="number" min={1} defaultValue={item?.quantity ?? 1} />
      </div>
      <SelectField label="持ってくる人" name="bringer" defaultValue={item ? bringerOf(item) : ''} hint="あとから変更できます。未定にすると参加者が名乗り出られます">
        <BringerOptions candidates={candidates} />
      </SelectField>
      <TextField label="メモ（任意）" name="note" defaultValue={item?.note ?? ''} />
      <div className={css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'sm' })}>
        {item ? (
          <Button variant="danger" loading={deleting} disabled={busy} onClick={() => fetcher.submit({ intent: 'delete-item', itemId: item.id }, { method: 'post' })}>
            <TrashIcon size={16} />
            削除
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary" loading={busy && !deleting} disabled={busy}>
          {item ? '保存' : '追加'}
        </Button>
      </div>
    </fetcher.Form>
  )
}

export function ItemList({ event, userId, canManage }: Props) {
  const candidates = event.participants.filter((p) => p.status !== 'declined')
  const mine = event.items.filter((item) => item.kind === 'personal' || item.assigneeId === userId)
  const sorted = [...event.items].sort((a, b) => rank(a) - rank(b)) // Array#sort は安定
  const openCount = event.items.filter((item) => rank(item) === 0).length
  const [adding, setAdding] = useState(false)

  return (
    <Card
      title="持ち物"
      action={
        canManage && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <PlusIcon size={14} />
            持ち物を追加
          </Button>
        )
      }
    >
      {mine.length > 0 && (
        <section className={css({ mb: 'lg' })}>
          <h3 className={css({ fontSize: 'sm', fontWeight: '700', mb: 'xs' })}>あなたが持っていくもの</h3>
          <ul>
            {mine.map((item) => (
              <MyItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {event.items.length === 0 ? (
        <EmptyState icon={<PackageIcon size={28} />} title="持ち物はまだ登録されていません" />
      ) : (
        <section>
          <h3 className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm', fontSize: 'sm', fontWeight: '700', mb: 'xs' })}>
            持ち物一覧
            {openCount > 0 && <Badge tone="warning">持ってくる人が未定 {openCount}件</Badge>}
          </h3>
          <ul>
            {sorted.map((item) => (
              <ItemRow key={item.id} item={item} userId={userId} canManage={canManage} candidates={candidates} />
            ))}
          </ul>
        </section>
      )}

      {canManage && (
        <Dialog open={adding} onClose={() => setAdding(false)} title="持ち物を追加">
          <ItemForm candidates={candidates} onDone={() => setAdding(false)} />
        </Dialog>
      )}
    </Card>
  )
}
