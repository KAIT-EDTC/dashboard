import { SHIFT_CAPACITY_MAX, unavailableDuring } from '@edtc/shared'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
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

function MemberChip({ member, mine }: { member: EventShift['members'][number]; mine: boolean }) {
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
    </li>
  )
}

function ShiftRow({ shift, userId, canJoin, canManage, candidates }: { shift: EventShift; userId: string; canJoin: boolean; canManage: boolean; candidates: Member[] }) {
  const myUnavailable = candidates.find((c) => c.userId === userId)?.unavailable ?? []
  const iAmBusy = unavailableDuring(myUnavailable, shift)
  // まだ入っていなくて、この時間に出れる人
  const freeCount = candidates.filter((c) => !unavailableDuring(c.unavailable, shift) && !shift.members.some((m) => m.userId === c.userId)).length
  const fetcher = useFetcher<FormErrors>()
  const [editing, setEditing] = useState(false)
  const busy = fetcher.state !== 'idle'
  const joined = shift.members.some((m) => m.userId === userId)
  const left = shift.capacity - shift.members.length
  const join = (value: boolean) => fetcher.submit({ intent: 'join-shift', shiftId: shift.id, joined: String(value) }, { method: 'post' })
  // 不参加にした人などが入ったままでも、選択肢から消えないようにする
  const options = [...candidates, ...shift.members.filter((m) => !candidates.some((c) => c.userId === m.userId)).map((m) => ({ ...m, unavailable: [] }))]

  return (
    <li className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'sm', py: 'sm', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
      <span className={css({ minW: '104px', fontSize: 'sm', fontWeight: '600', fontVariantNumeric: 'tabular-nums', pt: '2px' })}>{timeRange(shift)}</span>
      <div className={css({ flex: 1, minW: '180px', display: 'flex', flexDirection: 'column', gap: 'xs' })}>
        <p className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'xs', fontWeight: '600', fontSize: 'sm' })}>
          {shift.label}
          <span className={css({ color: 'fg.muted', fontWeight: '400' })}>
            {shift.members.length}/{shift.capacity}人
          </span>
          {left > 0 ? <Badge tone="warning">あと{left}人</Badge> : <Badge tone="success">決定</Badge>}
        </p>
        {shift.note && <p className={css({ fontSize: 'xs', color: 'fg.muted' })}>{shift.note}</p>}
        {left > 0 && <p className={css({ fontSize: 'xs', color: 'fg.muted' })}>この時間に出れる人（未割り当て）: {freeCount}人</p>}
        {shift.members.length > 0 && (
          <ul className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
            {shift.members.map((member) => (
              <MemberChip key={member.userId} member={member} mine={member.userId === userId} />
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
          canJoin &&
          left > 0 &&
          (iAmBusy ? (
            <Badge tone="danger">出れない時間</Badge>
          ) : (
            <Button variant="primary" loading={busy} onClick={() => join(true)}>
              入る
            </Button>
          ))
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

type ShiftDefaults = Pick<EventShift, 'label' | 'startsAt' | 'endsAt' | 'capacity'>

/** 追加と編集で共通のフォーム。shift があれば編集（削除もここから） */
function ShiftForm({ shift, defaults, candidates, onDone }: { shift?: EventShift; defaults?: ShiftDefaults; candidates: Member[]; onDone: () => void }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const busy = fetcher.state !== 'idle'
  const deleting = busy && fetcher.formData?.get('intent') === 'delete-shift'
  const initial = shift ?? defaults
  const [memberIds, setMemberIds] = useState<string[]>(shift?.members.map((m) => m.userId) ?? [])
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 2))
  const [range, setRange] = useState({ startsAt: initial?.startsAt ?? '', endsAt: initial?.endsAt ?? '' })
  const busyDuring = (member: Member) => !!range.startsAt && !!range.endsAt && unavailableDuring(member.unavailable, range)
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'ok' in fetcher.data) onDone()
  }, [fetcher.state, fetcher.data, onDone])
  const errors = fetcher.data && 'error' in fetcher.data ? fetcher.data : undefined
  const e = errors?.fieldErrors ?? {}
  const over = memberIds.length > Number(capacity || 0)

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
      <TextField
        label="人数"
        name="capacity"
        type="number"
        min={1}
        max={SHIFT_CAPACITY_MAX}
        required
        value={capacity}
        onChange={(event) => setCapacity(event.currentTarget.value)}
        error={e.capacity}
        hint="空きがあるうちは、参加者が自分で「入る」を押して入れます"
      />
      <fieldset className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}>
        <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>
          入る人（{memberIds.length}/{capacity || 0}人）
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
                label={busyDuring(member) ? `${fullName(member.user)}（出れない）` : fullName(member.user)}
                // 出れない人は選べない（もう入っている人は外せるようにしておく）
                disabled={busyDuring(member) && !memberIds.includes(member.userId)}
                checked={memberIds.includes(member.userId)}
                onChange={(event) => {
                  const { checked } = event.currentTarget
                  setMemberIds((ids) => (checked ? [...ids, member.userId] : ids.filter((id) => id !== member.userId)))
                }}
              />
            ))}
          </div>
        )}
        <p className={css({ fontSize: 'xs', color: over || e.memberIds ? 'danger.fg' : 'fg.subtle' })}>
          {over ? '人数を超えています' : (e.memberIds ?? '参加・未定と回答した人から選べます。出れない時間にかかる人や、同じ時間帯の別のシフトに入っている人は入れられません')}
        </p>
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
        <Button type="submit" variant="primary" loading={busy && !deleting} disabled={busy || over}>
          {shift ? '保存' : '追加'}
        </Button>
      </div>
    </fetcher.Form>
  )
}

/** 新しいシフトの初期値: 直前のシフトの続き（同じ長さ・人数）。まだ無ければイベントの開始から1時間 */
function nextDefaults(event: EventDetail): ShiftDefaults {
  const last = event.shifts.at(-1)
  if (last) return { label: last.label, startsAt: last.endsAt, endsAt: addMinutes(last.endsAt, minutesBetween(last.startsAt, last.endsAt)), capacity: last.capacity }
  return { label: '', startsAt: event.startsAt, endsAt: addMinutes(event.startsAt, 60), capacity: 2 }
}

export function ShiftList({ event, userId, canManage }: Props) {
  const [adding, setAdding] = useState(false)
  // シフトなしのイベントには出さない（イベントの編集で「シフトを組む」にする）
  if (!event.hasShifts) return null

  const candidates: Member[] = event.participants
    .filter((p) => p.status !== 'declined')
    .map((p) => ({ userId: p.userId, user: p.user, unavailable: p.unavailable }))
  const canJoin = candidates.some((c) => c.userId === userId)
  const mine = event.shifts.filter((shift) => shift.members.some((m) => m.userId === userId))
  const openCount = event.shifts.reduce((sum, shift) => sum + Math.max(0, shift.capacity - shift.members.length), 0)
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
      <section className={css({ mb: 'lg' })}>
        <h3 className={css({ fontSize: 'sm', fontWeight: '700', mb: 'xs' })}>出れない時間</h3>
        <AvailabilityGrid event={event} userId={userId} editable={canJoin} />
      </section>
      <h3 className={css({ fontSize: 'sm', fontWeight: '700', mb: 'xs' })}>シフトの枠</h3>
      {event.shifts.length === 0 ? (
        <EmptyState icon={<ClockIcon size={28} />} title="シフトの枠はまだありません">
          {canManage ? '「シフトを追加」から枠を作れます' : '主催者が枠を作るまでお待ちください'}
        </EmptyState>
      ) : (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm', fontSize: 'sm' })}>
            {mine.length > 0 ? (
              <span>
                あなたのシフト: <strong>{mine.map((shift) => `${shift.label} ${timeRange(shift)}`).join('、')}</strong>
              </span>
            ) : (
              <span className={css({ color: 'fg.muted' })}>{canJoin ? 'あなたはまだシフトに入っていません' : 'シフトに入るには、出欠で「参加」か「未定」と回答してください'}</span>
            )}
            {openCount > 0 && <Badge tone="warning">空き {openCount}人分</Badge>}
          </div>
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
