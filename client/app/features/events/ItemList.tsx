import { ITEM_KIND_LABELS, ITEM_KINDS } from '@edtc/shared'
import { useEffect, useRef } from 'react'
import { useFetcher } from 'react-router'
import { css, cx } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Checkbox, inputStyle } from '~/components/ui/Field'
import { PackageIcon, TrashIcon } from '~/components/ui/Icons'
import { EmptyState } from '~/components/ui/EmptyState'
import type { FormErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { EventDetail, EventItem } from './types'

type Props = { event: EventDetail; userId: string; canManage: boolean }

function SharedItemRow({ item, userId, canManage, candidates }: { item: EventItem; userId: string; canManage: boolean; candidates: EventDetail['participants'] }) {
  const fetcher = useFetcher<FormErrors>()
  const busy = fetcher.state !== 'idle'
  const update = (fields: Record<string, string>) => fetcher.submit({ intent: 'update-item', itemId: item.id, ...fields }, { method: 'post' })
  const mine = item.assigneeId === userId

  return (
    <li className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm', py: 'sm', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
      <div className={css({ flex: 1, minW: '160px' })}>
        <p className={css({ fontWeight: '600', fontSize: 'sm' })}>
          {item.name}
          {item.quantity > 1 && <span className={css({ color: 'fg.muted', fontWeight: '400' })}> ×{item.quantity}</span>}
          {item.prepared && <span className={css({ ml: 'xs' })}><Badge tone="success">準備済み</Badge></span>}
        </p>
        {item.note && <p className={css({ fontSize: 'xs', color: 'fg.muted' })}>{item.note}</p>}
        {fetcher.data?.error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{fetcher.data.error}</p>}
      </div>

      {canManage ? (
        <select
          aria-label={`${item.name}の担当者`}
          value={item.assigneeId ?? ''}
          onChange={(e) => update({ assigneeId: e.currentTarget.value })}
          disabled={busy}
          className={cx(inputStyle, css({ w: '160px' }))}
        >
          <option value="">担当者なし</option>
          {candidates.map((p) => (
            <option key={p.userId} value={p.userId}>
              {fullName(p.user)}
            </option>
          ))}
        </select>
      ) : item.assignee ? (
        <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm' })}>
          <Avatar user={item.assignee} size={22} />
          {fullName(item.assignee)}
        </span>
      ) : (
        <Badge tone="warning">担当者募集中</Badge>
      )}

      {!canManage && !item.assigneeId && (
        <Button size="sm" variant="primary" loading={busy} onClick={() => update({ assigneeId: userId })}>
          担当する
        </Button>
      )}
      {!canManage && mine && (
        <Button size="sm" variant="ghost" loading={busy} onClick={() => update({ assigneeId: '' })}>
          担当をやめる
        </Button>
      )}
      {(mine || canManage) && item.assigneeId && (
        <Checkbox label="準備OK" checked={item.prepared} disabled={busy} onChange={(e) => update({ prepared: String(e.currentTarget.checked) })} />
      )}
      {canManage && (
        <Button size="sm" variant="ghost" aria-label={`${item.name}を削除`} loading={busy} onClick={() => fetcher.submit({ intent: 'delete-item', itemId: item.id }, { method: 'post' })}>
          <TrashIcon size={14} />
        </Button>
      )}
    </li>
  )
}

function AddItemForm() {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'ok' in fetcher.data) formRef.current?.reset()
  }, [fetcher.state, fetcher.data])
  const error = fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  return (
    <fetcher.Form ref={formRef} method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', pt: 'md', mt: 'md', borderTopWidth: '1px', borderTopStyle: 'dashed' })}>
      <input type="hidden" name="intent" value="add-item" />
      {error && <Alert>{error}</Alert>}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: '2fr 1.2fr 0.6fr' }, gap: 'sm' })}>
        <input name="name" required placeholder="持ち物（例: はんだごて）" aria-label="持ち物" className={cx(inputStyle, css({ gridColumn: { base: 'span 2', md: 'auto' } }))} />
        <select name="kind" aria-label="種類" className={inputStyle} defaultValue="shared">
          {ITEM_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {ITEM_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min={1} defaultValue={1} aria-label="数量" className={inputStyle} />
      </div>
      <div className={css({ display: 'flex', gap: 'sm' })}>
        <input name="note" placeholder="メモ（任意）" aria-label="メモ" className={inputStyle} />
        <Button type="submit" loading={fetcher.state !== 'idle'}>
          追加
        </Button>
      </div>
    </fetcher.Form>
  )
}

export function ItemList({ event, userId, canManage }: Props) {
  const personal = event.items.filter((item) => item.kind === 'personal')
  const shared = event.items.filter((item) => item.kind === 'shared')
  const candidates = event.participants.filter((p) => p.status !== 'declined')
  const deleteFetcher = useFetcher()

  return (
    <Card title="持ち物">
      {event.items.length === 0 && <EmptyState icon={<PackageIcon size={28} />} title="持ち物はまだ登録されていません" />}

      {personal.length > 0 && (
        <section className={css({ mb: 'lg' })}>
          <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.subtle', mb: 'sm' })}>各自持参</h3>
          <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
            {personal.map((item) => (
              <li key={item.id} className={css({ display: 'flex', alignItems: 'center', gap: 'sm', fontSize: 'sm' })}>
                <span className={css({ flex: 1 })}>
                  ・{item.name}
                  {item.quantity > 1 && ` ×${item.quantity}`}
                  {item.note && <span className={css({ color: 'fg.muted', fontSize: 'xs', ml: 'sm' })}>{item.note}</span>}
                </span>
                {canManage && (
                  <Button size="sm" variant="ghost" aria-label={`${item.name}を削除`} onClick={() => deleteFetcher.submit({ intent: 'delete-item', itemId: item.id }, { method: 'post' })}>
                    <TrashIcon size={14} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {shared.length > 0 && (
        <section>
          <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.subtle', mb: 'xs' })}>共有（担当者が用意）</h3>
          <ul>
            {shared.map((item) => (
              <SharedItemRow key={item.id} item={item} userId={userId} canManage={canManage} candidates={candidates} />
            ))}
          </ul>
        </section>
      )}

      {canManage && <AddItemForm />}
    </Card>
  )
}
