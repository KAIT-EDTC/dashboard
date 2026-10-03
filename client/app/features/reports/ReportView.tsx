import { REPORT_FIELD_LABELS, type CommentableField, type ParticipantRole, type ReportField } from '@edtc/shared'
import type { ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Card } from '~/components/ui/Card'
import { CommentableText } from './CommentableText'
import { contextOf } from './content'
import { RatingMeter } from './Rating'
import { ReportInfo } from './ReportInfo'
import type { ReportDetail } from './types'

function Section({ field, children, after }: { field: ReportField; children: ReactNode; after?: ReactNode }) {
  return (
    <section className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
      <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.subtle' })}>{REPORT_FIELD_LABELS[field]}</h3>
      <div className={css({ fontSize: 'sm', lineHeight: '1.8' })}>{children}</div>
      {after}
    </section>
  )
}

type ActivityTextField = 'content' | 'reflection' | 'notes'
const EMPTY_TEXT: Record<ActivityTextField, string> = { content: '—', reflection: '—', notes: 'なし' }

type Props = {
  report: ReportDetail
  authorRole: ParticipantRole | null
  /** 右側の列（確認パネル・承認の流れ・履歴など） */
  aside?: ReactNode
  /** 確認する人向け: 本文の表示を差し替える（範囲選択とハイライト） */
  renderText?: (field: CommentableField, text: string) => ReactNode
  /** 確認する人向け: 各項目の下に出すもの（コメント欄など） */
  renderAfter?: (field: CommentableField) => ReactNode
  hint?: ReactNode
}

/** 報告書の読み取り表示（Excel様式の本書と同じ並び） */
export function ReportView({ report, authorRole, aside, renderText, renderAfter, hint }: Props) {
  const text = (field: ActivityTextField) => {
    const value = report[field]
    if (!value) return EMPTY_TEXT[field]
    return renderText ? renderText(field, value) : <CommentableText text={value} />
  }
  return (
    <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
      <Card title="報告内容">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          {hint}
          <Section field="division">{report.division ?? '未選択'}</Section>
          {(['content', 'reflection'] as const).map((field) => (
            <Section key={field} field={field} after={renderAfter?.(field)}>
              {text(field)}
            </Section>
          ))}
          <Section field="rating">
            <RatingMeter value={report.rating} />
          </Section>
          <Section field="notes" after={renderAfter?.('notes')}>
            {text('notes')}
          </Section>
        </div>
      </Card>
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
        {aside}
        <ReportInfo context={contextOf(report, authorRole)} />
      </div>
    </div>
  )
}
