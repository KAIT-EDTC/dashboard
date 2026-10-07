import { RSVP_STATUS_LABELS, RSVP_STATUSES } from '@edtc/shared'
import { Link, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { Checkbox, SelectField } from '~/components/ui/Field'
import { formatYen, fullName } from '~/lib/format'
import { RoleBadge } from './EventBadges'
import type { EventDetail, EventDetailResponse, EventParticipant, PendingMember } from './types'

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

/** 講師を選ぶ（主催者・管理者のみ）。講師は1人だけで、ほかの参加者は講師補助 */
function LecturerSelect({ participants }: { participants: EventParticipant[] }) {
  const fetcher = useFetcher()
  const current = participants.find((p) => p.role === 'lecturer')
  const pendingId = fetcher.formData ? String(fetcher.formData.get('role') === 'lecturer' ? fetcher.formData.get('userId') : '') : undefined
  return (
    <SelectField
      label="講師"
      value={pendingId ?? current?.userId ?? ''}
      disabled={fetcher.state !== 'idle'}
      onChange={(e) => {
        const userId = e.currentTarget.value
        // 「なし」は今の講師を講師補助に戻す。ほかの人を選ぶと、それまでの講師はサーバーで講師補助に戻る
        if (userId) fetcher.submit({ intent: 'update-participant', userId, role: 'lecturer' }, { method: 'post' })
        else if (current) fetcher.submit({ intent: 'update-participant', userId: current.userId, role: 'assistant' }, { method: 'post' })
      }}
      className={css({ maxW: '280px' })}
    >
      <option value="">なし</option>
      {participants.map((p) => (
        <option key={p.userId} value={p.userId}>
          {fullName(p.user)}
        </option>
      ))}
    </SelectField>
  )
}

type Props = {
  event: EventDetail
  pending: PendingMember[]
  canManage: boolean
  summary: EventDetailResponse['summary']
}

export function ParticipantList({ event, pending, canManage, summary }: Props) {
  const writerId = summary.writer?.id
  const going = event.participants.filter((p) => p.status === 'going')
  const paidCount = going.filter((p) => p.paid).length

  return (
    <Card title="参加者" padded={false}>
      {canManage && event.hasLecturer && going.length > 0 && (
        <div className={css({ px: 'lg', py: 'md', borderBottomWidth: '1px' })}>
          <LecturerSelect participants={going} />
        </div>
      )}
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
                    <span className={css({ fontSize: 'sm', fontWeight: '500', whiteSpace: 'nowrap' })}>{fullName(p.user)}</span>
                    {status === 'going' && event.hasLecturer && <RoleBadge role={p.role} />}
                    {p.userId === writerId && <Badge tone="accent">まとめ担当</Badge>}
                    {p.comment && <span className={css({ fontSize: 'xs', color: 'fg.muted', truncate: true })}>「{p.comment}」</span>}
                  </Link>
                  {canManage && status === 'going' && (
                    <ParticipantToggles participant={p} showPaid={!!event.fee} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {pending.length > 0 && (
        <section className={css({ px: 'lg', py: 'md', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
          <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'danger.fg', mb: 'sm' })}>未回答の対象者（{pending.length}人）</h3>
          <ul className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>
            {pending.map((member) => (
              <li key={member.id}>
                <Link to={`/members/${member.id}`} className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm', color: 'fg.muted', _hover: { color: 'accent' } })}>
                  <Avatar user={member} size={22} />
                  {fullName(member)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {event.participants.length === 0 && pending.length === 0 && <p className={css({ p: 'lg', fontSize: 'sm', color: 'fg.subtle' })}>まだ回答がありません</p>}
    </Card>
  )
}
