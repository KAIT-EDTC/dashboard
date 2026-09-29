import { RSVP_STATUS_LABELS, RSVP_STATUSES } from '@edtc/shared'
import { Link, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Card } from '~/components/ui/Card'
import { Button } from '~/components/ui/Button'
import { Checkbox } from '~/components/ui/Field'
import { formatYen, fullName } from '~/lib/format'
import { RoleBadge } from './EventBadges'
import type { EventDetail, EventParticipant } from './types'

/** 出席・支払いのチェック（主催者・管理者のみ） */
function ParticipantToggles({ participant, showPaid }: { participant: EventParticipant; showPaid: boolean }) {
  const fetcher = useFetcher()
  // 送信中は送信した値を表示して、チェックの反応を即座に見せる
  const pending = fetcher.formData
  const value = (name: 'attended' | 'paid') => (pending?.has(name) ? pending.get(name) === 'true' : participant[name])
  const toggle = (name: 'attended' | 'paid', checked: boolean) =>
    fetcher.submit({ intent: 'update-participant', userId: participant.userId, [name]: String(checked) }, { method: 'post' })

  return (
    <div className={css({ display: 'flex', gap: 'md', flexShrink: 0 })}>
      <Checkbox label="出席" checked={value('attended')} onChange={(e) => toggle('attended', e.currentTarget.checked)} />
      {showPaid && <Checkbox label="支払済" checked={value('paid')} onChange={(e) => toggle('paid', e.currentTarget.checked)} />}
    </div>
  )
}

/** 講師にする／外す（主催者・管理者のみ）。講師は1人だけで、ほかの参加者は講師補助 */
function LecturerToggle({ participant }: { participant: EventParticipant }) {
  const fetcher = useFetcher()
  const isLecturer = participant.role === 'lecturer'
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={fetcher.state !== 'idle'}
      onClick={() =>
        fetcher.submit(
          { intent: 'update-participant', userId: participant.userId, role: isLecturer ? 'assistant' : 'lecturer' },
          { method: 'post' },
        )
      }
    >
      {isLecturer ? '講師を外す' : '講師にする'}
    </Button>
  )
}

export function ParticipantList({ event, canManage }: { event: EventDetail; canManage: boolean }) {
  const going = event.participants.filter((p) => p.status === 'going')
  const paidCount = going.filter((p) => p.paid).length

  return (
    <Card title="参加者" padded={false}>
      {event.fee && going.length > 0 ? (
        <p className={css({ px: 'lg', py: 'sm', fontSize: 'sm', bg: 'surface.subtle', borderBottomWidth: '1px' })}>
          集金: {paidCount} / {going.length}人（{formatYen(paidCount * event.fee)} / {formatYen(going.length * event.fee)}）
        </p>
      ) : null}
      {RSVP_STATUSES.map((status) => {
        const list = event.participants.filter((p) => p.status === status)
        if (list.length === 0) return null
        return (
          <section key={status} className={css({ px: 'lg', py: 'md', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
            <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.subtle', mb: 'sm' })}>
              {RSVP_STATUS_LABELS[status]}（{list.length}人）
            </h3>
            <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
              {list.map((p) => (
                <li key={p.userId} className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm' })}>
                  <Link to={`/members/${p.userId}`} className={css({ display: 'flex', alignItems: 'center', gap: 'sm', flex: 1, minW: '140px', color: 'fg', _hover: { color: 'accent' } })}>
                    <Avatar user={p.user} size={28} />
                    <span className={css({ fontSize: 'sm', fontWeight: '500' })}>{fullName(p.user)}</span>
                    {status === 'going' && <RoleBadge role={p.role} />}
                    {p.comment && <span className={css({ fontSize: 'xs', color: 'fg.muted', truncate: true })}>「{p.comment}」</span>}
                  </Link>
                  {canManage && status === 'going' && (
                    <>
                      <LecturerToggle participant={p} />
                      <ParticipantToggles participant={p} showPaid={!!event.fee} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {event.participants.length === 0 && <p className={css({ p: 'lg', fontSize: 'sm', color: 'fg.subtle' })}>まだ回答がありません</p>}
    </Card>
  )
}
