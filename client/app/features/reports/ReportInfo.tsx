import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Card } from '~/components/ui/Card'
import { RoleBadge } from '~/features/events/EventBadges'
import { formatRange, formatTimestamp, fullName } from '~/lib/format'
import type { ReportContext } from './types'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className={css({ fontSize: 'xs', color: 'fg.subtle', fontWeight: '600' })}>{label}</dt>
      <dd className={css({ fontSize: 'sm' })}>{children}</dd>
    </div>
  )
}

/** イベントとメンバー情報から自動で入る欄（Excel様式の上半分） */
export function ReportInfo({ context }: { context: ReportContext }) {
  const { event, author, authorRole, submittedAt } = context
  return (
    <Card title="活動の情報">
      <dl className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'md' })}>
        <div className={css({ gridColumn: '1 / -1' })}>
          <Row label="活動名">
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </Row>
        </div>
        <div className={css({ gridColumn: '1 / -1' })}>
          <Row label="活動日時">{formatRange(event.startsAt, event.endsAt)}</Row>
        </div>
        <Row label="実施場所">{event.location || '未設定'}</Row>
        <Row label="役割">{authorRole ? <RoleBadge role={authorRole} /> : '—'}</Row>
        <Row label="氏名">{fullName(author)}</Row>
        {author.studentId && <Row label="学籍番号">{author.studentId}</Row>}
        <Row label="提出日">{submittedAt ? formatTimestamp(submittedAt) : '未提出'}</Row>
      </dl>
      <p className={css({ mt: 'md', fontSize: 'xs', color: 'fg.subtle' })}>
        日時・場所はイベント、役割は主催者の設定から入ります。違っている場合は主催者に連絡してください。
      </p>
    </Card>
  )
}
