import {
  COMMENTABLE_FIELDS,
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
import { ApprovalProgress } from './ApprovalProgress'
import { CharCount } from './CharCount'
import { CommentableText, type Mark, type RequestMode, type TextRange } from './CommentableText'
import { RequestCard, RequestComposer } from './InlineComment'
import type { ReportActionData } from './ReportForm'
import { ReportStatusBadge } from './ReportStatusBadge'
import { ReportView } from './ReportView'
import { ReviewHistory } from './ReviewHistory'
import type { ReportDetail, ReportDetailResponse } from './types'

type PendingRequest = Required<InlineCommentInput> & { key: string }
type Draft = TextRange & { field: CommentableField; mode: RequestMode }

const byPosition = (a: { field: CommentableField; start: number }, b: { field: CommentableField; start: number }) =>
  COMMENTABLE_FIELDS.indexOf(a.field) - COMMENTABLE_FIELDS.indexOf(b.field) || a.start - b.start

/** 確認する人の画面。本文を選ぶとその場でコメント・書き直し案を付けられ、まとめて承認・差し戻しする */
export function ReviewWorkspace({ report, authorRole }: Pick<ReportDetailResponse, 'report' | 'authorRole'>) {
  const fetcher = useFetcher<ReportActionData>()
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [comment, setComment] = useState('')
  const pending = fetcher.state !== 'idle' ? (fetcher.json as { review?: ReportReviewInput } | undefined)?.review?.decision : undefined
  const data = fetcher.state === 'idle' ? fetcher.data : undefined
  const canReject = comment.trim().length > 0 || requests.length > 0

  // 番号は項目の順・本文の位置の順。書いている途中のものも並びに入れる
  const ordered = [...requests, ...(draft ? [{ ...draft, key: 'draft' }] : [])].sort(byPosition)
  const numberOf = (key: string) => ordered.findIndex((r) => r.key === key) + 1

  const send = (review: ReportReviewInput) => fetcher.submit({ intent: 'review', review }, { method: 'post', encType: 'application/json' })
  const strip = (list: PendingRequest[]): InlineCommentInput[] =>
    list.map(({ field, start, end, quote, body, suggestion }) => ({ field, start, end, quote, body, suggestion }))

  const marksFor = (field: CommentableField): Mark[] => [
    ...requests.filter((r) => r.field === field).map((r) => ({ start: r.start, end: r.end, tone: 'request' as const, number: numberOf(r.key) })),
    ...(draft?.field === field ? [{ start: draft.start, end: draft.end, tone: 'selecting' as const, number: numberOf('draft') }] : []),
  ]

  return (
    <ReportView
      report={report}
      authorRole={authorRole}
      renderText={(field, text) => (
        <CommentableText text={text} marks={marksFor(field)} onRequest={(range, mode) => setDraft({ field, mode, ...range })} />
      )}
      renderAfter={(field) => {
        const list = requests.filter((r) => r.field === field).sort(byPosition)
        if (list.length === 0 && draft?.field !== field) return null
        return (
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', mt: 'xs' })}>
            {list.map((r) => (
              <RequestCard
                key={r.key}
                number={numberOf(r.key)}
                quote={r.quote}
                suggestion={r.suggestion}
                body={r.body}
                actions={
                  <Button size="sm" variant="ghost" onClick={() => setRequests((prev) => prev.filter((p) => p.key !== r.key))}>
                    <TrashIcon size={14} />
                    取り消す
                  </Button>
                }
              />
            ))}
            {draft?.field === field && (
              <RequestComposer
                key={`${draft.start}-${draft.end}-${draft.mode}`}
                number={numberOf('draft')}
                quote={draft.quote}
                mode={draft.mode}
                onCancel={() => setDraft(null)}
                onAdd={({ body, suggestion }) => {
                  const { field, start, end, quote } = draft
                  setRequests((prev) => [...prev, { field, start, end, quote, body, suggestion, key: crypto.randomUUID() }])
                  setDraft(null)
                }}
              />
            )}
          </div>
        )
      }}
      aside={
        <>
          <Card title="確認">
            <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
              {data && 'error' in data && data.error && <Alert>{data.error}</Alert>}
              <TextareaField
                label="全体へのコメント"
                value={comment}
                onChange={(e) => setComment(e.currentTarget.value)}
                rows={3}
                error={data && 'fieldErrors' in data ? data.fieldErrors?.comment : undefined}
                hint={<CharCount value={comment} max={REPORT_LIMITS.reviewComment.max} />}
              />
              <div className={css({ display: 'flex', gap: 'sm' })}>
                <Button
                  variant="danger"
                  loading={pending === 'reject'}
                  disabled={!canReject || (!!pending && pending !== 'reject')}
                  onClick={() => send({ decision: 'reject', comment, comments: strip(requests) })}
                >
                  <XIcon size={16} />
                  修正を依頼{requests.length > 0 && `（${requests.length}）`}
                </Button>
                <Button
                  variant="primary"
                  block
                  loading={pending === 'approve'}
                  disabled={!!pending && pending !== 'approve'}
                  onClick={() => {
                    if (requests.length === 0 || confirm('修正依頼が付いています。依頼せずに承認しますか？')) send({ decision: 'approve', comment })
                  }}
                >
                  <CheckIcon size={16} />
                  承認
                </Button>
              </div>
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
  const message = '提出を取り消して下書きに戻しますか？'
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
export function ReviewStatus({ report, canWithdraw }: { report: ReportDetail; canWithdraw: boolean }) {
  const step = report.approvalSteps[report.currentStep]
  return (
    <>
      <Card title="状態">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', fontSize: 'sm' })}>
          <div>
            <ReportStatusBadge status={report.status} step={step} />
          </div>
          {canWithdraw && <WithdrawButton />}
        </div>
      </Card>
      <ApprovalProgress report={report} />
      <ReviewHistory reviews={report.reviews} />
    </>
  )
}
