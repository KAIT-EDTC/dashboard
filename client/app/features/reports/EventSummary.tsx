import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { ButtonLink } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { SelectField } from '~/components/ui/Field'
import { ListIcon } from '~/components/ui/Icons'
import { RoleBadge } from '~/features/events/EventBadges'
import type { EventDetail, EventDetailResponse, EventParticipant } from '~/features/events/types'
import type { FormErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import { ExportButton } from './ExportButton'
import { ReportStatusBadge } from './ReportStatusBadge'

/** 講師を選ぶ（講師を置く種類で、主催者・管理者のみ）。講師がまとめ報告書を書く。講師は1人だけで、ほかの参加者は講師補助 */
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

type Summary = EventDetailResponse['summary']

/**
 * イベント詳細の上部のボタン: 担当者は「まとめ報告書を書く／続きを書く／見る」、
 * ほかの人は見られるとき（承認済み・承認する立場）だけ「まとめ報告書を見る」
 */
export function SummaryButton({ eventId, summary, userId, started }: { eventId: string; summary: Summary; userId: string; started: boolean }) {
  const { report } = summary
  if (summary.writer?.id === userId && !summary.started) {
    if (!started) return null
    return (
      <ButtonLink to={`/reports/summaries/new?eventId=${encodeURIComponent(eventId)}`}>
        <ListIcon size={16} />
        まとめ報告書を書く
      </ButtonLink>
    )
  }
  if (!report) return null
  const editable = report.status === 'draft' || report.status === 'rejected'
  return (
    <ButtonLink to={`/reports/${report.id}`}>
      <ListIcon size={16} />
      {editable && summary.writer?.id === userId ? 'まとめ報告書の続きを書く' : 'まとめ報告書を見る'}
    </ButtonLink>
  )
}

/** イベント詳細: まとめ報告書の担当者（主催者が指名できる）と状況 */
export function EventSummary({ event, summary, canManage, started }: { event: EventDetail; summary: Summary; canManage: boolean; started: boolean }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined
  const { writer, report } = summary
  const locked = report?.status === 'submitted' || report?.status === 'approved'
  const writerRole = event.hasLecturer ? event.participants.find((p) => p.userId === writer?.id)?.role : undefined
  // 担当者に選べるのは参加者（参加と回答した人・出席した人）
  const candidates = event.participants.filter((p) => p.status === 'going' || p.attended)

  return (
    <Card title="まとめ報告書" action={report?.status === 'approved' && <ExportButton size="sm" reportId={report.id} />}>
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
        {error && <Alert>{error}</Alert>}
        <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm' })}>
          {writer ? (
            <>
              <Avatar user={writer} size={28} />
              <span className={css({ fontWeight: '600' })}>{fullName(writer)}</span>
              {writerRole && <RoleBadge role={writerRole} />}
            </>
          ) : (
            <span className={css({ color: 'fg.subtle' })}>担当者未定</span>
          )}
          <ReportStatusBadge status={report?.status ?? null} step={report?.approvalSteps[report.currentStep]} emptyLabel="未提出" />
          {started && (
            <Badge tone={summary.submitted === summary.total && summary.total > 0 ? 'success' : 'neutral'}>
              活動報告書 {summary.submitted} / {summary.total}
            </Badge>
          )}
        </div>
        {/* 講師を置く種類は講師が書くので講師を選ぶ。置かない種類は担当者を選ぶ */}
        {canManage && event.hasLecturer && candidates.length > 0 && <LecturerSelect participants={candidates} />}
        {canManage && !locked && !event.hasLecturer && (
          <SelectField
            label="担当者"
            value={summary.assignedId ?? ''}
            disabled={fetcher.state !== 'idle'}
            onChange={(e) =>
              fetcher.submit({ intent: 'summary-writer', userId: e.currentTarget.value }, { method: 'post' })
            }
            className={css({ maxW: '280px' })}
          >
            <option value="">未定</option>
            {candidates.map((p) => (
              <option key={p.userId} value={p.userId}>
                {fullName(p.user)}
              </option>
            ))}
          </SelectField>
        )}
      </div>
    </Card>
  )
}
