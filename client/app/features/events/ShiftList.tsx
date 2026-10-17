import { shiftHours } from '@edtc/shared'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Card } from '~/components/ui/Card'
import { ClockIcon, PlusIcon, XIcon } from '~/components/ui/Icons'
import { EmptyState } from '~/components/ui/EmptyState'
import { Spinner } from '~/components/ui/Spinner'
import type { FormErrors } from '~/lib/form'
import { formatDate, fullName } from '~/lib/format'
import { AvailabilityGrid } from './AvailabilityGrid'
import type { EventDetail, EventShift } from './types'

type Props = { event: EventDetail; userId: string }

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

const chipButton = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '20px',
  h: '20px',
  mr: '-6px',
  borderRadius: 'full',
  color: 'fg.muted',
  cursor: 'pointer',
  _hover: { bg: 'danger.subtle', color: 'danger.fg' },
  _focusVisible: { shadow: 'focus', outline: 'none' },
})

/** 入っている人。自分なら色を変え、× で抜けられる */
function MemberChip({ member, away, onLeave }: { member: EventShift['members'][number]; away: string[]; onLeave?: { label: string; busy: boolean; leave: () => void } }) {
  return (
    <li
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'xs',
        minH: '28px',
        py: '2px',
        pl: '2px',
        pr: 'sm',
        fontSize: 'sm',
        borderRadius: 'full',
        borderWidth: '1px',
        borderColor: onLeave ? 'accent' : 'border',
        bg: onLeave ? 'accent.subtle' : 'surface',
      })}
    >
      <Avatar user={member.user} size={20} />
      {fullName(member.user)}
      {away.length > 0 && <span className={css({ fontSize: 'xs', color: 'danger.fg' })}>{hourRanges(away).join('・')} 不在</span>}
      {onLeave && (
        <button type="button" className={chipButton} disabled={onLeave.busy} aria-label={onLeave.label} title="このシフトから抜ける" onClick={onLeave.leave}>
          {onLeave.busy ? <Spinner size="sm" /> : <XIcon size={12} />}
        </button>
      )}
    </li>
  )
}

const joinButton = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  minH: '28px',
  px: 'sm',
  fontSize: 'sm',
  color: 'accent.fg',
  borderRadius: 'full',
  borderWidth: '1px',
  borderStyle: 'dashed',
  borderColor: 'accent',
  cursor: 'pointer',
  _hover: { bg: 'accent.subtle' },
  _focusVisible: { shadow: 'focus', outline: 'none' },
  _disabled: { opacity: 0.6, cursor: 'wait' },
})

function ShiftRow({ shift, userId, canJoin, unavailableOf }: { shift: EventShift; userId: string; canJoin: boolean; unavailableOf: (userId: string) => string[] }) {
  const fetcher = useFetcher<FormErrors>()
  const busy = fetcher.state !== 'idle'
  const hours = new Set(shiftHours(shift))
  // 送っている間は押した結果を先に見せる
  const joined = shift.members.some((m) => m.userId === userId)
  const join = (value: boolean) => fetcher.submit({ intent: 'join-shift', shiftId: shift.id, joined: String(value) }, { method: 'post' })
  const awayOf = (memberId: string) => unavailableOf(memberId).filter((slot) => hours.has(slot))

  return (
    <li className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'sm', py: 'sm', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
      <span className={css({ minW: '104px', fontSize: 'sm', fontWeight: '600', fontVariantNumeric: 'tabular-nums', pt: '4px' })}>{timeRange(shift)}</span>
      <div className={css({ flex: 1, minW: '180px', display: 'flex', flexDirection: 'column', gap: 'xs' })}>
        <p className={css({ display: 'flex', alignItems: 'center', gap: 'xs', fontWeight: '600', fontSize: 'sm', pt: '4px' })}>
          {shift.label}
          <span className={css({ color: 'fg.muted', fontWeight: '400' })}>{shift.members.length}人</span>
        </p>
        {shift.note && <p className={css({ fontSize: 'xs', color: 'fg.muted' })}>{shift.note}</p>}
        <ul className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
          {shift.members.map((member) => (
            <MemberChip
              key={member.userId}
              member={member}
              away={awayOf(member.userId)}
              onLeave={member.userId === userId ? { label: `${shift.label}（${timeRange(shift)}）から抜ける`, busy, leave: () => join(false) } : undefined}
            />
          ))}
          {!joined && canJoin && (
            <li>
              <button type="button" className={joinButton} disabled={busy} onClick={() => join(true)}>
                {busy ? <Spinner size="sm" /> : <PlusIcon size={14} />}
                入る
              </button>
            </li>
          )}
        </ul>
        {fetcher.data?.error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{fetcher.data.error}</p>}
      </div>
    </li>
  )
}

/** シフトの枠（イベントの設定から作る）と、入っている人。参加・未定の人は自分で入る／抜ける */
export function ShiftList({ event, userId }: Props) {
  // シフトなしのイベントには出さない（イベントの編集で「シフトを組む」にする）
  if (!event.hasShifts) return null

  const participants = event.participants.filter((p) => p.status !== 'declined')
  const canJoin = participants.some((p) => p.userId === userId)
  const unavailableOf = (memberId: string) => participants.find((p) => p.userId === memberId)?.unavailable ?? []
  const days = [...new Set(event.shifts.map((shift) => shift.startsAt.slice(0, 10)))]

  return (
    <Card title="シフト">
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
                    <ShiftRow key={shift.id} shift={shift} userId={userId} canJoin={canJoin} unavailableOf={unavailableOf} />
                  ))}
              </ul>
            </section>
          ))}
          <div className={css({ pt: 'md', borderTopWidth: '1px', _empty: { display: 'none' } })}>
            <AvailabilityGrid event={event} userId={userId} />
          </div>
        </div>
      )}
    </Card>
  )
}
