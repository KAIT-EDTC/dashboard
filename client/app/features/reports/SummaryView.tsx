import { HOSTING_LABELS, SUMMARY_FIELD_LABELS, type CommentableField, type SummaryField } from '@edtc/shared'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { RoleBadge } from '~/features/events/EventBadges'
import { fullName } from '~/lib/format'
import { CommentableText } from './CommentableText'
import { RatingMeter } from './Rating'
import { ReportInfo } from './ReportInfo'
import { ReportStatusBadge } from './ReportStatusBadge'
import { SummaryPhotos } from './SummaryPhotos'
import type { ReportDetail, SummaryMember } from './types'

function Section({ field, children, after }: { field: SummaryField; children: ReactNode; after?: ReactNode }) {
  return (
    <section className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
      <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.subtle' })}>{SUMMARY_FIELD_LABELS[field]}</h3>
      <div className={css({ fontSize: 'sm', lineHeight: '1.8' })}>{children}</div>
      {after}
    </section>
  )
}

type SummaryTextField = 'content' | 'overview' | 'impressions' | 'notes'
const EMPTY_TEXT: Record<SummaryTextField, string> = { content: '—', overview: '—', impressions: '—', notes: 'なし' }

type Props = {
  report: ReportDetail
  members: SummaryMember[]
  /** 活動写真のファイル名 */
  photos: string[]
  aside?: ReactNode
  /** 確認する人向け: 本文の表示を差し替える（範囲選択とハイライト） */
  renderText?: (field: CommentableField, text: string) => ReactNode
  /** 確認する人向け: 各項目の下に出すもの（コメント欄など） */
  renderAfter?: (field: CommentableField) => ReactNode
}

/** まとめ報告書の読み取り表示（Excel様式の本書と同じ並び） */
export function SummaryView({ report, members, photos, aside, renderText, renderAfter }: Props) {
  const text = (field: SummaryTextField) => {
    const value = report[field]
    if (!value) return EMPTY_TEXT[field]
    return renderText ? renderText(field, value) : <CommentableText text={value} />
  }
  const section = (field: SummaryTextField) => (
    <Section field={field} after={renderAfter?.(field)}>
      {text(field)}
    </Section>
  )
  const analysisOf = (userId: string) => report.analyses.find((a) => a.userId === userId)?.text

  return (
    <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', minW: 0 })}>
        <Card title="活動概要">
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
            <Section field="division">{report.division ?? '未選択'}</Section>
            {section('content')}
            <Section field="hosting">{report.hosting ? HOSTING_LABELS[report.hosting] : '未選択'}</Section>
          </div>
        </Card>

        <Card title={SUMMARY_FIELD_LABELS.analyses} padded={false}>
          {members.length === 0 ? (
            <p className={css({ p: 'lg', fontSize: 'sm', color: 'fg.subtle' })}>参加者がいません</p>
          ) : (
            <ul>
              {members.map((member) => (
                <li key={member.user.id} className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', px: 'lg', py: '12px', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
                  <span className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm' })}>
                    <Avatar user={member.user} size={24} />
                    {member.report?.id ? (
                      <Link to={`/reports/${member.report.id}`} className={css({ fontSize: 'sm', fontWeight: '600' })}>
                        {fullName(member.user)}
                      </Link>
                    ) : (
                      <span className={css({ fontSize: 'sm', fontWeight: '600' })}>{fullName(member.user)}</span>
                    )}
                    {member.role && <RoleBadge role={member.role} />}
                    {member.isWriter && !member.report ? (
                      <Badge tone="accent">担当者</Badge>
                    ) : (
                      member.report?.status !== 'approved' && <ReportStatusBadge status={member.report?.status ?? null} emptyLabel="未提出" />
                    )}
                    <span className={css({ ml: 'auto' })}>
                      <RatingMeter value={member.report?.rating ?? (member.isWriter ? report.rating : null)} />
                    </span>
                  </span>
                  <p className={css({ fontSize: 'sm', lineHeight: '1.8', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: analysisOf(member.user.id) ? 'fg' : 'fg.subtle' })}>
                    {analysisOf(member.user.id) || '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <SummaryPhotos reportId={report.id} photos={photos} editable={false} />

        <Card title="評価">
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
            {section('overview')}
            {section('impressions')}
            <Section field="rating">
              <RatingMeter value={report.rating} label={SUMMARY_FIELD_LABELS.rating} />
            </Section>
            {section('notes')}
          </div>
        </Card>
      </div>
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
        {aside}
        <ReportInfo context={{ event: report.event, author: report.author, authorRole: null, submittedAt: report.submittedAt, kind: 'summary' }} />
      </div>
    </div>
  )
}
