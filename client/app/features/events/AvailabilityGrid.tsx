import { shiftHours } from '@edtc/shared'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useFetcher } from 'react-router'
import { css, cx } from 'styled-system/css'
import type { FormErrors } from '~/lib/form'
import { formatDate } from '~/lib/format'
import type { EventDetail } from './types'

type Props = { event: EventDetail; userId: string }

type Drag = { anchor: string; mode: 'add' | 'remove'; base: Set<string>; pointerId: number }

function slotAt(x: number, y: number): string | null {
  return document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]')?.dataset.slot ?? null
}

/**
 * 入っているシフトの中で出れない時間を1時間ごとに選ぶ。シフトごとに1行で、指やマウスでなぞった範囲がまとめて変わる。
 * 出れるマスからなぞると「出れない」に、出れないマスからなぞると戻す。指を離したときに保存する。シフトに入っていなければ出さない
 */
export function AvailabilityGrid({ event, userId }: Props) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const mine = event.shifts.filter((shift) => shift.members.some((m) => m.userId === userId))
  // 1行に並べた全シフトの枠（なぞった範囲はこの並びで決める）
  const order = mine.flatMap(shiftHours)
  const inMyShifts = new Set(order)
  const saved = (event.participants.find((p) => p.userId === userId)?.unavailable ?? []).filter((slot) => inMyShifts.has(slot))

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
  const off = draft ?? pending ?? new Set(saved)
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  if (mine.length === 0) return null

  const save = (next: Set<string>) => {
    const form = new FormData()
    form.set('intent', 'availability')
    for (const slot of [...next].sort()) form.append('unavailable', slot)
    fetcher.submit(form, { method: 'post' })
  }

  const apply = (to: string) => {
    const current = drag.current
    if (!current) return
    const [from, until] = [order.indexOf(current.anchor), order.indexOf(to)].sort((a, b) => a - b)
    const next = new Set(current.base)
    for (const slot of order.slice(from, until + 1)) {
      if (current.mode === 'add') next.add(slot)
      else next.delete(slot)
    }
    setDraft(next)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const slot = slotAt(e.clientX, e.clientY)
    if (!slot) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const base = new Set(off)
    drag.current = { anchor: slot, mode: base.has(slot) ? 'remove' : 'add', base, pointerId: e.pointerId }
    apply(slot)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return
    const slot = slotAt(e.clientX, e.clientY)
    if (slot) apply(slot)
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
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const next = new Set(off)
    if (next.has(slot)) next.delete(slot)
    else next.add(slot)
    save(next)
  }
  const multiDay = new Set(mine.map((shift) => shift.startsAt.slice(0, 10))).size > 1

  return (
    <section className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
      <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.muted' })}>出れない時間</h3>
      <div
        role="grid"
        aria-label="入っているシフトの中で出れない時間"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onLostPointerCapture={finish}
        className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', userSelect: 'none' })}
      >
        {mine.map((shift) => (
          <div role="row" key={shift.id} className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'xs' })}>
            <span role="rowheader" className={css({ minW: '72px', fontSize: 'xs', color: 'fg.muted' })}>
              {multiDay && `${formatDate(shift.startsAt)} `}
              {shift.label}
            </span>
            {shiftHours(shift).map((slot) => {
              const isOff = off.has(slot)
              const hour = Number(slot.slice(11, 13))
              return (
                <div
                  role="gridcell"
                  key={slot}
                  data-slot={slot}
                  tabIndex={0}
                  aria-selected={isOff}
                  aria-label={`${hour}時台 ${isOff ? '出れない' : '出れる'}`}
                  onKeyDown={(e) => onKeyDown(e, slot)}
                  className={cx(
                    css({
                      minW: '40px',
                      h: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'xs',
                      fontVariantNumeric: 'tabular-nums',
                      borderWidth: '1px',
                      borderColor: 'border',
                      borderRadius: 'sm',
                      bg: 'accent.subtle',
                      color: 'accent.fg',
                      touchAction: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      _focusVisible: { shadow: 'focus' },
                    }),
                    isOff && css({ bg: 'danger.subtle', color: 'danger.fg', borderColor: 'danger.fg', textDecoration: 'line-through' }),
                  )}
                >
                  {hour}時
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{error}</p>}
    </section>
  )
}
