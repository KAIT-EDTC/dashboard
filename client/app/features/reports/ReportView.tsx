import { REPORT_FIELD_LABELS, type ParticipantRole, type ReportField } from '@edtc/shared'
import type { ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Card } from '~/components/ui/Card'
import { RatingMeter } from './Rating'
import { ReportInfo } from './ReportInfo'
import type { ReportDetail } from './types'

function Section({ field, children }: { field: ReportField; children: ReactNode }) {
  return (
    <section className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
      <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.subtle' })}>{REPORT_FIELD_LABELS[field]}</h3>
      <div className={css({ fontSize: 'sm', lineHeight: '1.8', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })}>{children}</div>
    </section>
  )
}

/** 報告書の読み取り表示（Excel様式の本書と同じ並び） */
export function ReportView({ report, authorRole, aside }: { report: ReportDetail; authorRole: ParticipantRole | null; aside?: ReactNode }) {
  return (
    <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
      <Card title="報告内容">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <Section field="division">{report.division ?? '未選択'}</Section>
          <Section field="content">{report.content || '—'}</Section>
          <Section field="reflection">{report.reflection || '—'}</Section>
          <Section field="rating">
            <RatingMeter value={report.rating} />
          </Section>
          <Section field="notes">{report.notes || 'なし'}</Section>
        </div>
      </Card>
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
        {aside}
        <ReportInfo report={report} authorRole={authorRole} />
      </div>
    </div>
  )
}
