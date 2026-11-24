import type { ItemKind } from '@edtc/shared'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { css, cx } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Dialog } from '~/components/ui/Dialog'
import { Checkbox, SelectField, TextField } from '~/components/ui/Field'
import { EditIcon, PackageIcon, PlusIcon, TrashIcon, UsersIcon } from '~/components/ui/Icons'
import { EmptyState } from '~/components/ui/EmptyState'
import type { FormErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { EventDetail, EventItem } from './types'

type Props = { event: EventDetail; userId: string; canManage: boolean }
type Participants = EventDetail['participants']

/** フォーム上の「持っていく人」: all=参加者全員 / 空=未定 / それ以外=担当者の userId */
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
      <option value="all">参加者全員（各自で用意）</option>
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

function ItemText({ item, muted }: { item: EventItem; muted?: boolean }) {
  return (
    <span className={css({ display: 'block', minW: 0 })}>
      <span className={cx(css({ display: 'block', fontWeight: '600', fontSize: 'sm' }), muted && css({ color: 'fg.muted' }))}>
        {item.name}
        {item.quantity > 1 && <span className={css({ color: 'fg.muted', fontWeight: '400' })}> ×{item.quantity}</span>}
      </span>
      {item.note && <span className={css({ display: 'block', fontSize: 'xs', color: 'fg.muted' })}>{item.note}</span>}
    </span>
  )
}

function FetchError({ error }: { error?: string }) {
  return error ? <p className={css({ gridColumn: '1 / -1', fontSize: 'xs', color: 'danger.fg' })}>{error}</p> : null
}

// ---------------------------------------------------------------------------
// あなたが持っていくもの: 自分の作業をここだけで完結させるチェックリスト
// ---------------------------------------------------------------------------

const checkRowStyle = css({
  display: 'grid',
  gridTemplateColumns: '20px minmax(0, 1fr) auto',
  alignItems: 'center',
  columnGap: 'sm',
  py: 'sm',
  borderTopWidth: '1px',
  _first: { borderTopWidth: '0' },
})

function MyItemRow({ item }: { item: EventItem }) {
  const fetcher = useFetcher<FormErrors>()
  const busy = fetcher.state !== 'idle'
  const releasing = busy && fetcher.formData?.has('assigneeId')
  // 送信中は押した後の状態を先に見せる
  const pendingPrepared = fetcher.formData?.get('prepared')
  const prepared = pendingPrepared != null ? pendingPrepared === 'true' : item.prepared
  const submit = (fields: Record<string, string>) => fetcher.submit({ intent: 'update-item', itemId: item.id, ...fields }, { method: 'post' })

  if (item.kind === 'personal') {
    return (
      <li className={checkRowStyle}>
        <UsersIcon size={18} className={css({ color: 'fg.muted', justifySelf: 'center' })} />
        <ItemText item={item} />
        <span className={css({ fontSize: 'xs', color: 'fg.muted' })}>各自で用意</span>
      </li>
    )
  }

  return (
    <li className={checkRowStyle}>
      <input
        type="checkbox"
        id={`prepared-${item.id}`}
        checked={prepared}
        disabled={busy}
        onChange={(e) => submit({ prepared: String(e.currentTarget.checked) })}
        className={css({ w: '18px', h: '18px', accentColor: 'accent', justifySelf: 'center', cursor: 'pointer' })}
      />
      <label htmlFor={`prepared-${item.id}`} className={css({ cursor: 'pointer', minW: 0 })}>
        <ItemText item={item} muted={prepared} />
      </label>
      <Button size="sm" variant="danger" loading={releasing} disabled={busy} onClick={() => submit({ assigneeId: '' })} aria-label={`${item.name}の担当をやめる`}>
        担当をやめる
      </Button>
      <FetchError error={fetcher.data?.error} />
    </li>
  )
}

function MyItems({ items }: { items: EventItem[] }) {
  const shared = items.filter((item) => item.kind === 'shared')
  const done = shared.filter((item) => item.prepared).length
  return (
    <section className={css({ mb: 'lg', p: 'md', bg: 'surface.muted', borderRadius: 'md' })}>
      <h3 className={css({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'sm', fontSize: 'sm', fontWeight: '700', mb: 'xs' })}>
        あなたが持っていくもの
        {shared.length > 0 && (
          <span className={css({ fontSize: 'xs', fontWeight: '600', color: done === shared.length ? 'success.fg' : 'fg.muted' })}>
            準備OK {done}/{shared.length}
          </span>
        )}
      </h3>
      <ul>
        {items.map((item) => (
          <MyItemRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 持ち物一覧: 持ち物｜担当｜状態｜操作 の固定列。幅が狭いときは2段に組み替える
// ---------------------------------------------------------------------------

const WIDE = '@container (min-width: 440px)'

const listStyle = css({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  columnGap: 'md',
  [WIDE]: { gridTemplateColumns: 'minmax(0, 1fr) auto auto auto' },
})

const listRowStyle = css({
  gridColumn: '1 / -1',
  display: 'grid',
  gridTemplateColumns: 'subgrid',
  alignItems: 'center',
  rowGap: 'xs',
  py: 'sm',
  minH: '50px',
  borderTopWidth: '1px',
  _first: { borderTopWidth: '0' },
})

const cell = {
  name: css({ gridColumn: '1', gridRow: '1', [WIDE]: { gridColumn: '1', gridRow: '1' } }),
  who: css({ gridColumn: '1', gridRow: '2', [WIDE]: { gridColumn: '2', gridRow: '1' } }),
  status: css({ gridColumn: '2', gridRow: '1', justifySelf: 'end', [WIDE]: { gridColumn: '3', gridRow: '1', justifySelf: 'start' } }),
  action: css({ gridColumn: '2', gridRow: '2', justifySelf: 'end', [WIDE]: { gridColumn: '4', gridRow: '1' } }),
}

const whoStyle = css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm', whiteSpace: 'nowrap' })

function ItemStatus({ item }: { item: EventItem }) {
  if (item.kind === 'personal') return null
  if (!item.assigneeId) return <Badge tone="warning">募集中</Badge>
  return item.prepared ? <Badge tone="success">準備済み</Badge> : <Badge>未準備</Badge>
}

function ItemRow({ item, userId, canManage, canClaim, candidates }: { item: EventItem; userId: string; canManage: boolean; canClaim: boolean; candidates: Participants }) {
  const fetcher = useFetcher<FormErrors>()
  const [editing, setEditing] = useState(false)
  const busy = fetcher.state !== 'idle'
  // 参加を取り消した人が担当のままでも、選択肢から消えないようにする
  const options = item.assignee && !candidates.some((p) => p.userId === item.assigneeId) ? [...candidates, { userId: item.assigneeId, user: item.assignee } as Participants[number]] : candidates

  return (
    <li className={listRowStyle}>
      <div className={cell.name}>
        <ItemText item={item} />
      </div>

      <div className={cell.who}>
        {item.kind === 'personal' ? (
          <span className={cx(whoStyle, css({ color: 'fg.muted' }))}>
            <UsersIcon size={18} />
            参加者全員
          </span>
        ) : item.assignee ? (
          <span className={whoStyle}>
            <Avatar user={item.assignee} size={22} />
            {fullName(item.assignee)}
            {item.assigneeId === userId && <span className={css({ color: 'fg.muted' })}>（あなた）</span>}
          </span>
        ) : canClaim ? (
          // 担当者の欄に、名乗り出るボタンを置く
          <Button size="sm" variant="primary" loading={busy} onClick={() => fetcher.submit({ intent: 'update-item', itemId: item.id, assigneeId: userId }, { method: 'post' })} aria-label={`${item.name}を自分が持っていく`}>
            自分が持っていく
          </Button>
        ) : (
          <span className={cx(whoStyle, css({ color: 'fg.muted' }))}>未定</span>
        )}
      </div>

      <div className={cell.status}>
        <ItemStatus item={item} />
      </div>

      {canManage && (
        <div className={cell.action}>
          <Button size="sm" aria-label={`${item.name}を編集`} title="編集" className={css({ w: '30px', px: '0' })} onClick={() => setEditing(true)}>
            <EditIcon size={16} />
          </Button>
          <Dialog open={editing} onClose={() => setEditing(false)} title="持ち物を編集">
            <ItemForm item={item} candidates={options} onDone={() => setEditing(false)} />
          </Dialog>
        </div>
      )}
      <FetchError error={fetcher.data?.error} />
    </li>
  )
}

/** 追加と編集で共通のフォーム。item があれば編集（準備状態の変更・削除もここから） */
function ItemForm({ item, candidates, onDone }: { item?: EventItem; candidates: Participants; onDone: () => void }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const busy = fetcher.state !== 'idle'
  const deleting = busy && fetcher.formData?.get('intent') === 'delete-item'
  const [bringer, setBringer] = useState(item ? bringerOf(item) : '')
  const [prepared, setPrepared] = useState(item?.prepared ?? false)
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'ok' in fetcher.data) onDone()
  }, [fetcher.state, fetcher.data, onDone])
  const error = fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined
  const hasAssignee = bringer !== '' && bringer !== 'all'

  return (
    <fetcher.Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
      <input type="hidden" name="intent" value={item ? 'update-item' : 'add-item'} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {item && <input type="hidden" name="prepared" value={String(hasAssignee && prepared)} />}
      {error && <Alert>{error}</Alert>}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', sm: '2fr 1fr' }, gap: 'md' })}>
        <TextField label="持ち物" name="name" required placeholder="例: はんだごて" defaultValue={item?.name} />
        <TextField label="数量" name="quantity" type="number" min={1} defaultValue={item?.quantity ?? 1} />
      </div>
      <SelectField
        label="持っていく人"
        name="bringer"
        value={bringer}
        onChange={(e) => {
          setBringer(e.currentTarget.value)
          setPrepared(false) // 担当が替わったら準備状態はやり直し
        }}
        hint="あとから変更できます。未定にすると参加者が「自分が持っていく」で名乗り出られます"
      >
        <BringerOptions candidates={candidates} />
      </SelectField>
      {item && hasAssignee && <Checkbox label="準備済み" checked={prepared} onChange={(e) => setPrepared(e.currentTarget.checked)} />}
      <TextField label="メモ（任意）" name="note" defaultValue={item?.note ?? ''} />
      <div className={css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'sm' })}>
        {item ? (
          <Button
            variant="danger"
            loading={deleting}
            disabled={busy}
            onClick={() => {
              if (confirm(`「${item.name}」を削除しますか？`)) fetcher.submit({ intent: 'delete-item', itemId: item.id }, { method: 'post' })
            }}
          >
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
  const participating = candidates.some((p) => p.userId === userId)
  // 不参加と答えた人は名乗り出られない（まだ答えていない人は名乗り出られる）
  const declined = event.participants.some((p) => p.userId === userId && p.status === 'declined')
  const sorted = [...event.items].sort((a, b) => rank(a) - rank(b)) // Array#sort は安定
  // 全員で持っていくものは、参加する人にだけ「あなたが持っていくもの」として出す
  const mine = sorted.filter((item) => item.assigneeId === userId || (item.kind === 'personal' && participating))
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
      <div className={css({ containerType: 'inline-size' })}>
        {mine.length > 0 && <MyItems items={mine} />}

        {event.items.length === 0 ? (
          <EmptyState icon={<PackageIcon size={28} />} title="持ち物はまだ登録されていません" />
        ) : (
          <section>
            <h3 className={css({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'sm', fontSize: 'sm', fontWeight: '700', mb: 'xs' })}>
              持ち物一覧
              <span className={css({ fontSize: 'xs', fontWeight: '600', color: openCount > 0 ? 'warning.fg' : 'fg.muted' })}>
                全{event.items.length}件{openCount > 0 && `・募集中 ${openCount}件`}
              </span>
            </h3>
            <ul className={listStyle}>
              {sorted.map((item) => (
                <ItemRow key={item.id} item={item} userId={userId} canManage={canManage} canClaim={!declined} candidates={candidates} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {canManage && (
        <Dialog open={adding} onClose={() => setAdding(false)} title="持ち物を追加">
          <ItemForm candidates={candidates} onDone={() => setAdding(false)} />
        </Dialog>
      )}
    </Card>
  )
}
