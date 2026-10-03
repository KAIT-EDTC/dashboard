import {
  APPROVAL_STEP_LABELS,
  REPORT_FIELD_LABELS,
  REPORT_LIMITS,
  type CommentableField,
  type InlineCommentInput,
  type ReportReviewInput,
} from '@edtc/shared'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { TextareaField } from '~/components/ui/Field'
import { CheckIcon, EditIcon, TrashIcon, XIcon } from '~/components/ui/Icons'
import { fullName } from '~/lib/format'
import { ApprovalProgress } from './ApprovalProgress'
import { CharCount } from './CharCount'
import { CommentableText, type Highlight, type TextRange } from './CommentableText'
import { InlineCommentComposer, InlineCommentItem } from './InlineComment'
import type { ReportActionData } from './ReportForm'
import { ReportStatusBadge } from './ReportStatusBadge'
import { ReportView } from './ReportView'
import { ReviewHistory } from './ReviewHistory'
import type { ReportDetail, ReportDetailResponse } from './types'

type PendingComment = InlineCommentInput & { key: string }

/**
 * 確認する人の画面。本文をドラッグで選んで範囲にコメントを付け（PRレビューのように）、
 * 全体へのコメントと合わせて承認・差し戻しする
 */
export function ReviewWorkspace({ report, authorRole }: Pick<ReportDetailResponse, 'report' | 'authorRole'>) {
  const fetcher = useFetcher<ReportActionData>()
  const [comments, setComments] = useState<PendingComment[]>([])
  const [selection, setSelection] = useState<(TextRange & { field: CommentableField }) | null>(null)
  const [comment, setComment] = useState('')
  const pending = fetcher.state !== 'idle' ? (fetcher.json as { review?: ReportReviewInput } | undefined)?.review?.decision : undefined
  const data = fetcher.state === 'idle' ? fetcher.data : undefined
  const step = report.approvalSteps[report.currentStep]
  const canReject = comment.trim().length > 0 || comments.length > 0

  const send = (review: ReportReviewInput) => fetcher.submit({ intent: 'review', review }, { method: 'post', encType: 'application/json' })
  const strip = (list: PendingComment[]): InlineCommentInput[] =>
    list.map(({ field, start, end, quote, body }) => ({ field, start, end, quote, body }))

  const highlightsFor = (field: CommentableField): Highlight[] => [
    ...comments.filter((c) => c.field === field).map((c) => ({ start: c.start, end: c.end, tone: 'comment' as const })),
    ...(selection?.field === field ? [{ start: selection.start, end: selection.end, tone: 'selecting' as const }] : []),
  ]

  return (
    <ReportView
      report={report}
      authorRole={authorRole}
      hint={<Alert tone="info">直してほしいところは、本文をドラッグして選ぶとその範囲にコメントできます。</Alert>}
      renderText={(field, text) => <CommentableText text={text} highlights={highlightsFor(field)} onSelect={(range) => setSelection({ field, ...range })} />}
      renderAfter={(field) => (
        <>
          {comments
            .filter((c) => c.field === field)
            .map((c) => (
              <InlineCommentItem
                key={c.key}
                quote={c.quote}
                body={c.body}
                action={
                  <Button size="sm" variant="ghost" onClick={() => setComments((prev) => prev.filter((p) => p.key !== c.key))}>
                    <TrashIcon size={14} />
                    取り消す
                  </Button>
                }
              />
            ))}
          {selection?.field === field && (
            <InlineCommentComposer
              key={`${selection.start}-${selection.end}`}
              quote={selection.quote}
              onCancel={() => setSelection(null)}
              onAdd={(body) => {
                setComments((prev) => [...prev, { ...selection, body, key: crypto.randomUUID() }])
                setSelection(null)
                window.getSelection()?.removeAllRanges()
              }}
            />
          )}
        </>
      )}
      aside={
        <>
          <Card title="確認">
            <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
              <p className={css({ color: 'fg.muted' })}>
                {step && `${APPROVAL_STEP_LABELS[step]}として確認しています。`}
                承認するとイベントページに載り、差し戻すと提出者にコメントが届きます（DiscordのDMで通知）。
              </p>
              {data && 'error' in data && data.error && <Alert>{data.error}</Alert>}
              {comments.length > 0 && (
                <p>
                  本文へのコメント: <strong>{comments.length}件</strong>（{[...new Set(comments.map((c) => REPORT_FIELD_LABELS[c.field]))].join('、')}）
                </p>
              )}
              <TextareaField
                label="全体へのコメント"
                value={comment}
                onChange={(e) => setComment(e.currentTarget.value)}
                rows={3}
                placeholder="報告書全体について（承認時は任意）"
                error={data && 'fieldErrors' in data ? data.fieldErrors?.comment : undefined}
                hint={<CharCount value={comment} max={REPORT_LIMITS.reviewComment.max} />}
              />
              <div className={css({ display: 'flex', gap: 'sm' })}>
                <Button
                  variant="danger"
                  loading={pending === 'reject'}
                  disabled={!canReject || (!!pending && pending !== 'reject')}
                  onClick={() => send({ decision: 'reject', comment, comments: strip(comments) })}
                >
                  <XIcon size={16} />
                  差し戻す
                </Button>
                <Button
                  variant="primary"
                  block
                  loading={pending === 'approve'}
                  disabled={!!pending && pending !== 'approve'}
                  onClick={() => {
                    const message = comments.length > 0 ? '本文へのコメントは承認では送られません。承認しますか？' : 'この報告書を承認しますか？'
                    if (confirm(message)) send({ decision: 'approve', comment })
                  }}
                >
                  <CheckIcon size={16} />
                  承認する
                </Button>
              </div>
              {!canReject && <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>差し戻すには、全体へのコメントか本文へのコメントを付けてください。</p>}
            </div>
          </Card>
          <ApprovalProgress report={report} />
          <ReviewHistory reviews={report.reviews} />
        </>
      }
    />
  )
}

/** 本人向け: 承認待ちの間に提出を取り消して、下書きに戻す */
function WithdrawButton() {
  const fetcher = useFetcher<ReportActionData>()
  const data = fetcher.state === 'idle' ? fetcher.data : undefined
  const message = '提出を取り消して下書きに戻しますか？\n承認待ちから外れます。直して再提出すると、もう一度確認に回ります。'
  return (
    <>
      {data && 'error' in data && data.error && <Alert>{data.error}</Alert>}
      <Button
        loading={fetcher.state !== 'idle'}
        onClick={() => confirm(message) && fetcher.submit({ intent: 'withdraw' }, { method: 'post', encType: 'application/json' })}
      >
        <EditIcon size={16} />
        提出を取り消して編集する
      </Button>
    </>
  )
}

/** 確認する権限がない人・本人向けの右側の列 */
export function ReviewStatus({ report, isAuthor, canWithdraw }: { report: ReportDetail; isAuthor: boolean; canWithdraw: boolean }) {
  const step = report.approvalSteps[report.currentStep]
  return (
    <>
      <Card title="状態">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', fontSize: 'sm' })}>
          <div>
            <ReportStatusBadge status={report.status} step={step} />
          </div>
          {report.status === 'submitted' && step && (
            <p className={css({ color: 'fg.muted' })}>
              {isAuthor ? '提出済みです。' : ''}
              {step === 'designated' && report.approver ? `${fullName(report.approver)}さん` : step === 'division_head' && report.division ? `${report.division}長` : APPROVAL_STEP_LABELS[step]}
              の確認を待っています。
            </p>
          )}
          {canWithdraw && <WithdrawButton />}
        </div>
      </Card>
      <ApprovalProgress report={report} />
      <ReviewHistory reviews={report.reviews} />
    </>
  )
}
