import { REPORT_FIELD_LABELS, REPORT_FIELDS, REPORT_LIMITS, type ReportField, type ReportReviewInput } from '@edtc/shared'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { ChipCheckbox, TextareaField } from '~/components/ui/Field'
import { CheckIcon, XIcon } from '~/components/ui/Icons'
import { formatTimestamp, fullName } from '~/lib/format'
import { CharCount } from './CharCount'
import type { ReportActionData } from './ReportForm'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { ReportDetail } from './types'

/** 部長・管理者向け: 承認するか、直してほしい項目とコメントを付けて差し戻す */
export function ReviewPanel({ report }: { report: ReportDetail }) {
  const fetcher = useFetcher<ReportActionData>()
  const [rejecting, setRejecting] = useState(false)
  const [fields, setFields] = useState<ReportField[]>([])
  const [comment, setComment] = useState('')
  const pending = fetcher.state !== 'idle' ? (fetcher.json as { review?: ReportReviewInput } | undefined)?.review?.decision : undefined
  const data = fetcher.state === 'idle' ? fetcher.data : undefined
  const fieldErrors = data && 'fieldErrors' in data ? (data.fieldErrors ?? {}) : {}

  const send = (review: ReportReviewInput) => fetcher.submit({ intent: 'review', review }, { method: 'post', encType: 'application/json' })
  const toggle = (field: ReportField, checked: boolean) =>
    setFields((prev) => (checked ? [...prev, field] : prev.filter((f) => f !== field)))

  return (
    <Card title="確認">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
        <p className={css({ color: 'fg.muted' })}>内容を確認して、承認するか差し戻してください。結果は提出者にDiscordで通知されます。</p>
        {report.rejectionComment && (
          <Alert tone="info">
            前回の差し戻し（{report.rejectionFields.map((f) => REPORT_FIELD_LABELS[f]).join('、')}）{'\n'}
            {report.rejectionComment}
          </Alert>
        )}
        {data && 'error' in data && data.error && <Alert>{data.error}</Alert>}

        {rejecting ? (
          <>
            <fieldset>
              <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>直してほしい項目</legend>
              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>
                {REPORT_FIELDS.map((field) => (
                  <ChipCheckbox key={field} label={REPORT_FIELD_LABELS[field]} checked={fields.includes(field)} onChange={(e) => toggle(field, e.currentTarget.checked)} />
                ))}
              </div>
              {fieldErrors.fields && <p className={css({ mt: 'xs', fontSize: 'xs', color: 'danger.fg' })}>{fieldErrors.fields}</p>}
            </fieldset>
            <TextareaField
              label="コメント"
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              rows={4}
              required
              placeholder="どこをどう直せばよいか"
              error={fieldErrors.comment}
              hint={<CharCount value={comment} max={REPORT_LIMITS.rejectionComment.max} />}
            />
            <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
              <Button variant="ghost" onClick={() => setRejecting(false)} disabled={!!pending}>
                キャンセル
              </Button>
              <Button variant="danger" loading={pending === 'reject'} onClick={() => send({ decision: 'reject', fields, comment })}>
                差し戻す
              </Button>
            </div>
          </>
        ) : (
          <div className={css({ display: 'flex', gap: 'sm' })}>
            <Button variant="danger" onClick={() => setRejecting(true)} disabled={!!pending}>
              <XIcon size={16} />
              差し戻す
            </Button>
            <Button variant="primary" block loading={pending === 'approve'} onClick={() => confirm('この報告書を承認しますか？') && send({ decision: 'approve' })}>
              <CheckIcon size={16} />
              承認する
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

/** 承認の状況（確認する権限がない人・本人向け） */
export function ReviewStatus({ report, isAuthor }: { report: ReportDetail; isAuthor: boolean }) {
  return (
    <Card title="確認">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', fontSize: 'sm' })}>
        <div>
          <ReportStatusBadge status={report.status} />
        </div>
        {report.status === 'submitted' && (
          <p className={css({ color: 'fg.muted' })}>
            {isAuthor ? `提出済みです。${report.division ?? ''}の部長の確認を待っています。` : '部長の確認を待っています。'}
          </p>
        )}
        {report.status === 'approved' && report.reviewer && (
          <p className={css({ display: 'flex', alignItems: 'center', gap: 'sm', color: 'fg.muted' })}>
            <Avatar user={report.reviewer} size={24} />
            {fullName(report.reviewer)} が承認
            {report.reviewedAt && <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>{formatTimestamp(report.reviewedAt)}</span>}
          </p>
        )}
      </div>
    </Card>
  )
}
