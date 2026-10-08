import { REPORT_LIMITS, type CommentableField, type InlineCommentInput, type ReportReviewInput } from '@edtc/shared'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { TextareaField } from '~/components/ui/Field'
import { CheckIcon, EditIcon, TrashIcon, XIcon } from '~/components/ui/Icons'
import { CharCount } from './CharCount'
import { CommentableText, type Mark, type RequestMode, type TextRange } from './CommentableText'
import { byPosition } from './content'
import { RequestCard, RequestComposer } from './InlineComment'
import type { ReportActionData } from './ReportForm'
import { choiceStyle } from './Rating'
import { ReportStatusBadge } from './ReportStatusBadge'
import { ReportView } from './ReportView'
import { ReviewProgress } from './ReviewHistory'
import { SummaryView } from './SummaryView'
import type { ReportDetail, ReportDetailResponse } from './types'

type PendingRequest = Required<InlineCommentInput> & { key: string }
type Decision = ReportReviewInput['decision']
type Draft = TextRange & { field: CommentableField; mode: RequestMode }

/** 確認する人の画面。本文を選ぶとその場でコメント・書き直し案を付けられ、まとめて承認・差し戻しする */
export function ReviewWorkspace({ report, authorRole, members, photos }: Pick<ReportDetailResponse, 'report' | 'authorRole' | 'members' | 'photos'>) {
  const fetcher = useFetcher<ReportActionData>()
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [comment, setComment] = useState('')
  const [chosen, setChosen] = useState<Decision | null>(null)
  const sending = fetcher.state !== 'idle'
  const data = fetcher.state === 'idle' ? fetcher.data : undefined
  // 修正依頼を書いている間（範囲コメントがある・書きかけがある）は承認を選べない
  const writingRequests = requests.length > 0 || draft !== null
  const decision: Decision | null = writingRequests ? 'reject' : chosen
  const canSubmit = decision === 'approve' || (decision === 'reject' && (comment.trim().length > 0 || requests.length > 0))

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

  const viewProps = {
    renderText: (field: CommentableField, text: string) => (
      <CommentableText text={text} marks={marksFor(field)} onRequest={(range, mode) => setDraft({ field, mode, ...range })} />
    ),
    renderAfter: (field: CommentableField) => {
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
    },
    aside: (
      <>
        <Card title="確認">
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
            {data && 'error' in data && data.error && <Alert>{data.error}</Alert>}
            {/* 先にどちらにするかを選んでから送る（修正依頼を書いたまま承認してしまわないように） */}
            <fieldset className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
              <legend className={css({ srOnly: true })}>確認の結果</legend>
              <div className={css({ display: 'flex', gap: 'sm' })}>
                {(
                  [
                    { value: 'reject', label: '修正を依頼', icon: <XIcon size={16} />, disabled: false },
                    { value: 'approve', label: '承認', icon: <CheckIcon size={16} />, disabled: writingRequests },
                  ] as const
                ).map((option) => (
                  <label key={option.value} className={choiceStyle}>
                    <input
                      type="radio"
                      name="decision"
                      value={option.value}
                      checked={decision === option.value}
                      disabled={option.disabled || sending}
                      onChange={() => setChosen(option.value)}
                      className={css({ srOnly: true })}
                    />
                    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', fontSize: 'sm' })}>
                      {option.icon}
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              {writingRequests && <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>修正依頼を付けている間は承認できません</p>}
            </fieldset>
            <TextareaField
              label={decision === 'approve' ? 'コメント（任意）' : '全体へのコメント'}
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              rows={3}
              error={data && 'fieldErrors' in data ? data.fieldErrors?.comment : undefined}
              hint={<CharCount value={comment} max={REPORT_LIMITS.reviewComment.max} />}
            />
            <Button
              variant={decision === 'approve' ? 'primary' : 'danger'}
              block
              loading={sending}
              disabled={!canSubmit}
              onClick={() => send(decision === 'approve' ? { decision: 'approve', comment } : { decision: 'reject', comment, comments: strip(requests) })}
            >
              {decision === 'approve' ? (
                <>
                  <CheckIcon size={16} />
                  承認する
                </>
              ) : decision === 'reject' ? (
                <>
                  <XIcon size={16} />
                  修正を依頼する{requests.length > 0 && `（${requests.length}件）`}
                </>
              ) : (
                '送信'
              )}
            </Button>
          </div>
        </Card>
        <ReviewProgress report={report} />
      </>
    ),
  }

  return report.kind === 'summary' ? (
    <SummaryView report={report} members={members} photos={photos} {...viewProps} />
  ) : (
    <ReportView report={report} authorRole={authorRole} {...viewProps} />
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
      <ReviewProgress report={report} />
    </>
  )
}
