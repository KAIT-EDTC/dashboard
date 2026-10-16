import { hourLabel, hourSlot, shiftDays } from '@edtc/shared'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useFetcher } from 'react-router'
import { css, cx } from 'styled-system/css'
import type { FormErrors } from '~/lib/form'
import { formatDate, fullName } from '~/lib/format'
import type { EventDetail } from './types'

type Props = {
  event: EventDetail
  userId: string
  /** 参加・未定と回答していれば、自分の出れない時間を変えられる */
  editable: boolean
}

type Cell = { day: number; hour: number }
type Drag = { anchor: Cell; mode: 'add' | 'remove'; base: Set<string>; pointerId: number }

/** なぞった範囲（開始のマスと今のマスを角にした四角）の枠 */
function slotsBetween(days: string[], a: Cell, b: Cell): string[] {
  const slots: string[] = []
  for (let day = Math.min(a.day, b.day); day <= Math.max(a.day, b.day); day++) {
    for (let hour = Math.min(a.hour, b.hour); hour <= Math.max(a.hour, b.hour); hour++) slots.push(hourSlot(days[day], hour))
  }
  return slots
}

function cellAt(x: number, y: number): Cell | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-day][data-hour]')
  return el ? { day: Number(el.dataset.day), hour: Number(el.dataset.hour) } : null
}

/**
 * 出れない時間を1時間ごとに選ぶ表（列が日、行が時間）。Googleカレンダーのように、指やマウスでなぞった範囲がまとめて変わる。
 * 出れるマスからなぞると「出れない」に、出れないマスからなぞると「出れる」に戻す。指を離したときに保存する
 */
export function AvailabilityGrid({ event, userId, editable }: Props) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const days = shiftDays(event)
  const start = event.shiftStartHour ?? 0
  const hours = Array.from({ length: (event.shiftEndHour ?? 0) - start }, (_, i) => start + i)
  const participants = event.participants.filter((p) => p.status !== 'declined')
  const saved = participants.find((p) => p.userId === userId)?.unavailable ?? []

  const drag = useRef<Drag | null>(null)
  const [draft, setDraftState] = useState<Set<string> | null>(null)
  // 指を離したときに最新のなぞった範囲を読めるよう ref にも持つ
  const draftRef = useRef<Set<string> | null>(null)
  const setDraft = (next: Set<string> | null) => {
    draftRef.current = next
    setDraftState(next)
  }
  // 保存中は送った内容を表示して、すぐに反映されたように見せる
  const pending = fetcher.formData ? new Set(fetcher.formData.getAll('unavailable').map(String)) : null
  const mine = draft ?? pending ?? new Set(saved)
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  const myShiftSlots = new Set(
    event.shifts
      .filter((shift) => shift.members.some((m) => m.userId === userId))
      .flatMap((shift) => days.flatMap((day) => hours.map((hour) => hourSlot(day, hour))).filter((slot) => slot >= shift.startsAt.slice(0, 13) + ':00' && slot < shift.endsAt)),
  )
  const splitHour = event.shiftSplitHour

  const save = (next: Set<string>) => {
    const form = new FormData()
    form.set('intent', 'availability')
    for (const slot of [...next].sort()) form.append('unavailable', slot)
    fetcher.submit(form, { method: 'post' })
  }

  const apply = (to: Cell) => {
    const current = drag.current
    if (!current) return
    const next = new Set(current.base)
    for (const slot of slotsBetween(days, current.anchor, to)) {
      if (current.mode === 'add') next.add(slot)
      else next.delete(slot)
    }
    setDraft(next)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0) return
    const cell = cellAt(e.clientX, e.clientY)
    if (!cell) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const base = new Set(mine)
    drag.current = { anchor: cell, mode: base.has(hourSlot(days[cell.day], cell.hour)) ? 'remove' : 'add', base, pointerId: e.pointerId }
    apply(cell)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return
    const cell = cellAt(e.clientX, e.clientY)
    if (cell) apply(cell)
  }
  const finish = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return
    drag.current = null
    if (draftRef.current) save(draftRef.current)
    setDraft(null)
  }
  const cancel = () => {
    drag.current = null
    setDraft(null)
  }
  // キーボードでは1マスずつ切り替える
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, slot: string) => {
    if (!editable || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    const next = new Set(mine)
    if (next.has(slot)) next.delete(slot)
    else next.add(slot)
    save(next)
  }

  const columns = `48px repeat(${days.length}, minmax(${days.length > 3 ? 72 : 96}px, 1fr))`

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
      <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
        {editable
          ? '出れない時間を指（マウス）でなぞって選んでください。もう一度なぞると出れるに戻ります。数字はその時間に出れる人数です。'
          : 'シフトに入るには、出欠で「参加」か「未定」と回答してください。数字はその時間に出れる人数です。'}
      </p>
      <div className={css({ overflowX: 'auto' })}>
        <div
          role="grid"
          aria-label="出れない時間"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={cancel}
          onLostPointerCapture={finish}
          className={css({ display: 'grid', userSelect: 'none', minW: 'fit-content' })}
          style={{ gridTemplateColumns: columns }}
        >
          <div role="row" className={css({ display: 'contents' })}>
            <span />
            {days.map((day) => (
              <span role="columnheader" key={day} className={css({ textAlign: 'center', fontSize: 'xs', fontWeight: '700', pb: 'xs' })}>
                {formatDate(day)}
              </span>
            ))}
          </div>
          {hours.map((hour) => (
            <div role="row" key={hour} className={css({ display: 'contents' })}>
              <span
                role="rowheader"
                className={cx(
                  css({ fontSize: 'xs', color: 'fg.muted', textAlign: 'right', pr: 'xs', transform: 'translateY(-0.6em)', fontVariantNumeric: 'tabular-nums' }),
                  hour === splitHour && css({ color: 'fg', fontWeight: '700' }),
                )}
              >
                {hourLabel(hour)}
              </span>
              {days.map((day, dayIndex) => {
                const slot = hourSlot(day, hour)
                const off = mine.has(slot)
                const inShift = myShiftSlots.has(slot)
                const free = participants.filter((p) => !(p.userId === userId ? mine.has(slot) : p.unavailable.includes(slot)))
                const busy = participants.filter((p) => !free.includes(p))
                return (
                  <div
                    role="gridcell"
                    key={slot}
                    data-day={dayIndex}
                    data-hour={hour}
                    tabIndex={editable ? 0 : -1}
                    aria-selected={off}
                    aria-label={`${formatDate(day)} ${hourLabel(hour)}〜${hourLabel(hour + 1)} ${off ? '出れない' : '出れる'}（出れる人 ${free.length}人）`}
                    title={busy.length > 0 ? `出れない: ${busy.map((p) => fullName(p.user)).join('、')}` : undefined}
                    onKeyDown={(e) => onKeyDown(e, slot)}
                    className={cx(
                      css({
                        h: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '2px',
                        px: 'xs',
                        fontSize: 'xs',
                        borderLeftWidth: '1px',
                        borderTopWidth: '1px',
                        borderColor: 'border',
                        bg: 'surface',
                        touchAction: 'none',
                        cursor: editable ? 'pointer' : 'default',
                        outline: 'none',
                        _focusVisible: { shadow: 'focus' },
                        _last: { borderRightWidth: '1px' },
                      }),
                      inShift && css({ bg: 'accent.subtle', color: 'accent.fg' }),
                      off && css({ bg: 'danger.subtle', color: 'danger.fg', backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(0,0,0,0.05) 6px 12px)' }),
                      hour === splitHour && css({ borderTopWidth: '2px', borderTopColor: 'fg.muted' }),
                    )}
                    style={hour === hours.at(-1) ? { borderBottomWidth: '1px' } : undefined}
                  >
                    <span className={css({ fontWeight: '600' })}>{off ? '出れない' : inShift ? 'シフト' : ''}</span>
                    <span className={css({ color: off ? 'danger.fg' : 'fg.subtle', fontVariantNumeric: 'tabular-nums' })}>{free.length}人</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{error}</p>}
    </div>
  )
}
