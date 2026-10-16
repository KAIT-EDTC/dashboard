import { shiftHours } from '@edtc/shared'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Dialog } from '~/components/ui/Dialog'
import { ChipCheckbox, TextField } from '~/components/ui/Field'
import { ClockIcon, EditIcon, PlusIcon, TrashIcon } from '~/components/ui/Icons'
import { EmptyState } from '~/components/ui/EmptyState'
import type { FormErrors } from '~/lib/form'
import { formatDate, fullName } from '~/lib/format'
import { AvailabilityGrid } from './AvailabilityGrid'
import type { EventDetail, EventShift } from './types'

type Props = { event: EventDetail; userId: string; canManage: boolean }
/** シフトに入れる人。出れない時間（1時間ごと）つき */
type Member = EventShift['members'][number] & { unavailable: string[] }

/** `YYYY-MM-DDTHH:mm` に分を足す（日付をまたいでもよい） */
function addMinutes(value: string, minutes: number): string {
  return new Date(new Date(`${value}:00Z`).getTime() + minutes * 60_000).toISOString().slice(0, 16)
}
const minutesBetween = (from: string, to: string) => (new Date(`${to}:00Z`).getTime() - new Date(`${from}:00Z`).getTime()) / 60_000

/** 終わりが同じ日なら時刻だけ */
const timeRange = (shift: EventShift) =>
  `${shift.startsAt.slice(11)}〜${shift.startsAt.slice(0, 10) === shift.endsAt.slice(0, 10) ? shift.endsAt.slice(11) : `${formatDate(shift.endsAt)} ${shift.endsAt.slice(11)}`}`

/** 出れない時間（1時間ごと）を続いている範囲ごとにまとめる（例: 11〜13時） */
function hourRanges(slots: string[]): string[] {
  const hours = slots.map((slot) => Number(slot.slice(11, 13)))
  const ranges: string[] = []
  for (let i = 0; i < hours.length; i++) {
    let j = i
    while (j + 1 < hours.length && hours[j + 1] === hours[j] + 1) j++
    ranges.push(`${hours[i]}〜${hours[j] + 1}時`)
    i = j
  }
  return ranges
}

function MemberChip({ member, mine, away }: { member: EventShift['members'][number]; mine: boolean; away: string[] }) {
  return (
    <li
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'xs',
        py: '2px',
        pl: '2px',
        pr: 'sm',
        fontSize: 'sm',
        borderRadius: 'full',
        borderWidth: '1px',
        borderColor: mine ? 'accent' : 'border',
        bg: mine ? 'accent.subtle' : 'surface',
      })}
    >
      <Avatar user={member.user} size={20} />
      {fullName(member.user)}
      {away.length > 0 && <span className={css({ fontSize: 'xs', color: 'danger.fg' })}>{hourRanges(away).join('・')} 不在</span>}
    </li>
  )
}

function ShiftRow({ shift, userId, canJoin, canManage, candidates }: { shift: EventShift; userId: string; canJoin: boolean; canManage: boolean; candidates: Member[] }) {
  const hours = new Set(shiftHours(shift))
  // このシフトの中で出れない時間
  const awayOf = (memberId: string) => (candidates.find((c) => c.userId === memberId)?.unavailable ?? []).filter((slot) => hours.has(slot))
  const fetcher = useFetcher<FormErrors>()
  const [editing, setEditing] = useState(false)
  const busy = fetcher.state !== 'idle'
  const joined = shift.members.some((m) => m.userId === userId)
  const join = (value: boolean) => fetcher.submit({ intent: 'join-shift', shiftId: shift.id, joined: String(value) }, { method: 'post' })
  // 不参加にした人などが入ったままでも、選択肢から消えないようにする
  const options = [...candidates, ...shift.members.filter((m) => !candidates.some((c) => c.userId === m.userId)).map((m) => ({ ...m, unavailable: [] }))]

  return (
    <li className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'sm', py: 'sm', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
      <span className={css({ minW: '104px', fontSize: 'sm', fontWeight: '600', fontVariantNumeric: 'tabular-nums', pt: '2px' })}>{timeRange(shift)}</span>
      <div className={css({ flex: 1, minW: '180px', display: 'flex', flexDirection: 'column', gap: 'xs' })}>
        <p className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'xs', fontWeight: '600', fontSize: 'sm' })}>
          {shift.label}
          <span className={css({ color: 'fg.muted', fontWeight: '400' })}>{shift.members.length}人</span>
        </p>
        {shift.note && <p className={css({ fontSize: 'xs', color: 'fg.muted' })}>{shift.note}</p>}
        {shift.members.length > 0 && (
          <ul className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
            {shift.members.map((member) => (
              <MemberChip key={member.userId} member={member} mine={member.userId === userId} away={awayOf(member.userId)} />
            ))}
          </ul>
        )}
        {fetcher.data?.error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{fetcher.data.error}</p>}
      </div>
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
        {joined ? (
          <Button variant="ghost" loading={busy} onClick={() => join(false)}>
            抜ける
          </Button>
        ) : (
          canJoin && (
            <Button variant="primary" loading={busy} onClick={() => join(true)}>
              入る
            </Button>
          )
        )}
        {canManage && (
          <>
            <Button aria-label={`${shift.label}（${timeRange(shift)}）を編集`} onClick={() => setEditing(true)}>
              <EditIcon size={16} />
              編集
            </Button>
            <Dialog open={editing} onClose={() => setEditing(false)} title="シフトを編集">
              <ShiftForm shift={shift} candidates={options} onDone={() => setEditing(false)} />
            </Dialog>
          </>
        )}
      </div>
    </li>
  )
}

type ShiftDefaults = Pick<EventShift, 'label' | 'startsAt' | 'endsAt'>

/** 追加と編集で共通のフォーム。shift があれば編集（削除もここから） */
function ShiftForm({ shift, defaults, candidates, onDone }: { shift?: EventShift; defaults?: ShiftDefaults; candidates: Member[]; onDone: () => void }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const busy = fetcher.state !== 'idle'
  const deleting = busy && fetcher.formData?.get('intent') === 'delete-shift'
  const initial = shift ?? defaults
  const [memberIds, setMemberIds] = useState<string[]>(shift?.members.map((m) => m.userId) ?? [])
  const [range, setRange] = useState({ startsAt: initial?.startsAt ?? '', endsAt: initial?.endsAt ?? '' })
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'ok' in fetcher.data) onDone()
  }, [fetcher.state, fetcher.data, onDone])
  const errors = fetcher.data && 'error' in fetcher.data ? fetcher.data : undefined
  const e = errors?.fieldErrors ?? {}

  return (
    <fetcher.Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
      <input type="hidden" name="intent" value={shift ? 'update-shift' : 'add-shift'} />
      {shift && <input type="hidden" name="shiftId" value={shift.id} />}
      {errors?.error && <Alert>{errors.error}</Alert>}
      <TextField label="持ち場" name="label" required placeholder="例: 受付、店番、呼び込み" defaultValue={initial?.label} error={e.label} />
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', sm: '1fr 1fr' }, gap: 'md' })}>
        <TextField
          label="開始"
          name="startsAt"
          type="datetime-local"
          required
          value={range.startsAt}
          onChange={(event) => setRange({ ...range, startsAt: event.currentTarget.value })}
          error={e.startsAt}
        />
        <TextField
          label="終了"
          name="endsAt"
          type="datetime-local"
          required
          value={range.endsAt}
          onChange={(event) => setRange({ ...range, endsAt: event.currentTarget.value })}
          error={e.endsAt}
        />
      </div>
      <fieldset className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}>
        <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>
          入る人（{memberIds.length}人）
        </legend>
        {candidates.length === 0 ? (
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>まだ参加者がいません</p>
        ) : (
          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
            {candidates.map((member) => (
              <ChipCheckbox
                key={member.userId}
                name="memberIds"
                value={member.userId}
                label={fullName(member.user)}
                checked={memberIds.includes(member.userId)}
                onChange={(event) => {
                  const { checked } = event.currentTarget
                  setMemberIds((ids) => (checked ? [...ids, member.userId] : ids.filter((id) => id !== member.userId)))
                }}
              />
            ))}
          </div>
        )}
        {e.memberIds && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{e.memberIds}</p>}
      </fieldset>
      <TextField label="メモ（任意）" name="note" placeholder="例: 釣り銭の確認をお願いします" defaultValue={shift?.note ?? ''} error={e.note} />
      <div className={css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'sm' })}>
        {shift ? (
          <Button variant="danger" loading={deleting} disabled={busy} onClick={() => fetcher.submit({ intent: 'delete-shift', shiftId: shift.id }, { method: 'post' })}>
            <TrashIcon size={16} />
            削除
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary" loading={busy && !deleting} disabled={busy}>
          {shift ? '保存' : '追加'}
        </Button>
      </div>
    </fetcher.Form>
  )
}

/** 新しいシフトの初期値: 直前のシフトの続き（同じ長さ）。まだ無ければイベントの開始から1時間 */
function nextDefaults(event: EventDetail): ShiftDefaults {
  const last = event.shifts.at(-1)
  if (last) return { label: last.label, startsAt: last.endsAt, endsAt: addMinutes(last.endsAt, minutesBetween(last.startsAt, last.endsAt)) }
  return { label: '', startsAt: event.startsAt, endsAt: addMinutes(event.startsAt, 60) }
}

export function ShiftList({ event, userId, canManage }: Props) {
  const [adding, setAdding] = useState(false)
  // シフトなしのイベントには出さない（イベントの編集で「シフトを組む」にする）
  if (!event.hasShifts) return null

  const candidates: Member[] = event.participants
    .filter((p) => p.status !== 'declined')
    .map((p) => ({ userId: p.userId, user: p.user, unavailable: p.unavailable }))
  const canJoin = candidates.some((c) => c.userId === userId)
  const days = [...new Set(event.shifts.map((shift) => shift.startsAt.slice(0, 10)))]

  return (
    <Card
      title="シフト"
      action={
        canManage && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <PlusIcon size={14} />
            シフトを追加
          </Button>
        )
      }
    >
      {event.shifts.length === 0 ? (
        <EmptyState icon={<ClockIcon size={28} />} title="シフトの枠はまだありません" />
      ) : (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          {days.map((day) => (
            <section key={day}>
              {days.length > 1 && <h3 className={css({ fontSize: 'sm', fontWeight: '700', mb: 'xs' })}>{formatDate(day)}</h3>}
              <ul>
                {event.shifts
                  .filter((shift) => shift.startsAt.startsWith(day))
                  .map((shift) => (
                    <ShiftRow key={shift.id} shift={shift} userId={userId} canJoin={canJoin} canManage={canManage} candidates={candidates} />
                  ))}
              </ul>
            </section>
          ))}
          <div className={css({ pt: 'md', borderTopWidth: '1px', _empty: { display: 'none' } })}>
            <AvailabilityGrid event={event} userId={userId} />
          </div>
        </div>
      )}

      {canManage && (
        <Dialog open={adding} onClose={() => setAdding(false)} title="シフトを追加">
          <ShiftForm defaults={nextDefaults(event)} candidates={candidates} onDone={() => setAdding(false)} />
        </Dialog>
      )}
    </Card>
  )
}
