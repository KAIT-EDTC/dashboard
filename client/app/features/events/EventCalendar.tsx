import { todayInJst, type CategoryTone } from '@edtc/shared'
import { Link } from 'react-router'
import { css, cx } from 'styled-system/css'
import { buttonStyle } from '~/components/ui/Button'
import { ChevronLeftIcon, ChevronRightIcon } from '~/components/ui/Icons'
import type { EventListItem } from './types'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const TONE_COLORS: Record<CategoryTone, string> = {
  accent: css({ bg: 'accent.subtle', color: 'accent.fg' }),
  success: css({ bg: 'success.subtle', color: 'success.fg' }),
  warning: css({ bg: 'warning.subtle', color: 'warning.fg' }),
  danger: css({ bg: 'danger.subtle', color: 'danger.fg' }),
  neutral: css({ bg: 'surface.muted', color: 'fg.muted' }),
}

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM の前後の月 */
export function shiftMonth(month: string, diff: number): string {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(y, m - 1 + diff, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/** カレンダーに表示する範囲（前後の月の端数を含む6週間） */
export function calendarRange(month: string): { from: string; to: string; days: string[] } {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const start = new Date(y, m - 1, 1 - first.getDay())
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  return { from: days[0], to: days[days.length - 1], days }
}

export function EventCalendar({ month, events, monthHref }: { month: string; events: EventListItem[]; monthHref: (month: string) => string }) {
  const { days } = calendarRange(month)
  const today = todayInJst()
  const [y, m] = month.split('-').map(Number)
  const byDay = new Map<string, EventListItem[]>()
  for (const event of events) {
    const day = event.startsAt.slice(0, 10)
    byDay.set(day, [...(byDay.get(day) ?? []), event])
  }

  return (
    <div>
      <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 'md' })}>
        <Link to={monthHref(shiftMonth(month, -1))} replace className={buttonStyle({ variant: 'ghost', size: 'sm' })} aria-label="前の月">
          <ChevronLeftIcon size={16} />
        </Link>
        <h2 className={css({ fontSize: 'lg', fontWeight: '700' })}>
          {y}年{m}月
        </h2>
        <Link to={monthHref(shiftMonth(month, 1))} replace className={buttonStyle({ variant: 'ghost', size: 'sm' })} aria-label="次の月">
          <ChevronRightIcon size={16} />
        </Link>
      </div>
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderWidth: '1px', borderColor: 'border', borderRadius: 'lg', overflow: 'hidden' })}>
        {WEEKDAYS.map((weekday, i) => (
          <div key={weekday} className={css({ py: 'xs', textAlign: 'center', fontSize: 'xs', fontWeight: '600', bg: 'surface.muted', color: i === 0 ? 'danger.fg' : i === 6 ? 'accent.fg' : 'fg.muted' })}>
            {weekday}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day.startsWith(month)
          return (
            <div
              key={day}
              className={cx(
                css({ minH: { base: '64px', md: '104px' }, p: '4px', borderTopWidth: '1px', borderLeftWidth: '1px', display: 'flex', flexDirection: 'column', gap: '2px', minW: 0 }),
                !inMonth && css({ bg: 'surface.subtle' }),
              )}
            >
              <span
                className={cx(
                  css({ fontSize: 'xs', fontWeight: '600', w: '22px', h: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'full', color: inMonth ? 'fg' : 'fg.subtle' }),
                  day === today && css({ bg: 'accent', color: 'fg.inverted' }),
                )}
              >
                {Number(day.slice(8))}
              </span>
              {byDay.get(day)?.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  title={event.title}
                  className={cx(css({ display: 'block', px: '4px', fontSize: '11px', fontWeight: '600', borderRadius: 'sm', truncate: true, _hover: { opacity: 0.8 } }), TONE_COLORS[event.categoryTone])}
                >
                  {event.startsAt.slice(11)} {event.title}
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
