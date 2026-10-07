import { nowInJst, RSVP_STATUS_LABELS, RSVP_STATUSES, type RsvpStatus } from '@edtc/shared'
import { useFetcher } from 'react-router'
import { css, cx } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { inputStyle } from '~/components/ui/Field'
import type { FormErrors } from '~/lib/form'
import type { EventDetail } from './types'

const optionStyle = css({
  position: 'relative',
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  h: '40px',
  fontSize: 'sm',
  fontWeight: '600',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'md',
  cursor: 'pointer',
  color: 'fg.muted',
  '&:has(input:checked)': { borderColor: 'accent', bg: 'accent.subtle', color: 'accent.fg' },
  '&:has(input:focus-visible)': { shadow: 'focus' },
})

export function RsvpPanel({ event, userId, canManage, isTarget }: { event: EventDetail; userId: string; canManage: boolean; isTarget: boolean }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const mine = event.participants.find((p) => p.userId === userId)
  const closed = !!event.rsvpDeadline && nowInJst() > event.rsvpDeadline && !canManage
  const error = fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined

  return (
    <Card title="出欠">
      <fetcher.Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        <input type="hidden" name="intent" value="rsvp" />
        {closed && <Alert tone="warning">回答期限を過ぎています。変更したい場合は主催者に連絡してください。</Alert>}
        {error && <Alert>{error}</Alert>}
        {!isTarget && !mine && (
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
            このイベントは{event.targetDivisions.length > 0 ? `${event.targetDivisions.join('・')}向け` : '対象者限定'}ですが、参加する場合は回答できます。
          </p>
        )}
        <fieldset disabled={closed} className={css({ display: 'flex', gap: 'sm' })}>
          <legend className={css({ srOnly: true })}>出欠</legend>
          {RSVP_STATUSES.map((status: RsvpStatus) => (
            <label key={status} className={cx(optionStyle)}>
              <input type="radio" name="status" value={status} defaultChecked={mine?.status === status} required className={css({ srOnly: true })} />
              {RSVP_STATUS_LABELS[status]}
            </label>
          ))}
        </fieldset>
        <input name="comment" defaultValue={mine?.comment} placeholder="コメント（遅れて参加します など）" maxLength={200} disabled={closed} className={inputStyle} aria-label="コメント" />
        <Button type="submit" variant="primary" loading={fetcher.state !== 'idle'} disabled={closed}>
          {mine ? '回答を更新' : '回答する'}
        </Button>
      </fetcher.Form>
    </Card>
  )
}
