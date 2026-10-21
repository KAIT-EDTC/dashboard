import { shiftHours } from '@edtc/shared'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useFetcher } from 'react-router'
import { css, cx } from 'styled-system/css'
import type { FormErrors } from '~/lib/form'
import type { EventShift } from './types'

type Props = {
  shift: EventShift
  /** 自分の出られない時間（全シフト分）。保存はこのシフトの分だけ差し替えて丸ごと送る */
  unavailable: string[]
}

type Drag = { anchor: string; mode: 'add' | 'remove'; base: Set<string>; pointerId: number }

function slotAt(x: number, y: number): string | null {
  return document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]')?.dataset.slot ?? null
}

/**
 * 入っているシフトの中で出られない時間を1時間ごとに選ぶ（シフトの行の下に出す）。指やマウスでなぞった範囲がまとめて変わる。
 * 出られるマスからなぞると「出られない」に、出られないマスからなぞると戻す。指を離したときに保存する
 */
export function AvailabilityGrid({ shift, unavailable }: Props) {
  // どのシフトの行から保存しても同じ送信中の内容が見えるよう、fetcher はシフト間で共有する
  const fetcher = useFetcher<FormErrors | { ok: true }>({ key: 'shift-availability' })
  const order = shiftHours(shift)

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
  const current = pending ?? new Set(unavailable)
  const off = draft ?? current
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  const save = (next: Set<string>) => {
    const form = new FormData()
    form.set('intent', 'availability')
    for (const slot of [...next].sort()) form.append('unavailable', slot)
    fetcher.submit(form, { method: 'post' })
  }

  const apply = (to: string) => {
    const active = drag.current
    if (!active) return
    const [from, until] = [order.indexOf(active.anchor), order.indexOf(to)].sort((a, b) => a - b)
    const next = new Set(active.base)
    for (const slot of order.slice(from, until + 1)) {
      if (active.mode === 'add') next.add(slot)
      else next.delete(slot)
    }
    setDraft(next)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const slot = slotAt(e.clientX, e.clientY)
    if (!slot || !order.includes(slot)) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const base = new Set(current)
    drag.current = { anchor: slot, mode: base.has(slot) ? 'remove' : 'add', base, pointerId: e.pointerId }
    apply(slot)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return
    const slot = slotAt(e.clientX, e.clientY)
    if (slot && order.includes(slot)) apply(slot)
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
    const next = new Set(current)
    if (next.has(slot)) next.delete(slot)
    else next.add(slot)
    save(next)
  }

  return (
    <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'xs' })}>
      <span className={css({ fontSize: 'xs', color: 'fg.muted', mr: '2px' })}>出られない時間</span>
      <div
        role="grid"
        aria-label={`${shift.label}の中で出られない時間`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onLostPointerCapture={finish}
        className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs', userSelect: 'none' })}
      >
        <div role="row" className={css({ display: 'contents' })}>
          {order.map((slot) => {
            const isOff = off.has(slot)
            const hour = Number(slot.slice(11, 13))
            return (
              <div
                role="gridcell"
                key={slot}
                data-slot={slot}
                tabIndex={0}
                aria-selected={isOff}
                aria-label={`${hour}時台 ${isOff ? '出られない' : '出られる'}`}
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
      </div>
      {error && <p className={css({ w: 'full', fontSize: 'xs', color: 'danger.fg' })}>{error}</p>}
    </div>
  )
}
