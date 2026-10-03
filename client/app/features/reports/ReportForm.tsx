import {
  REPORT_FIELD_LABELS,
  REPORT_LIMITS,
  reportSubmitSchema,
  type CommentableField,
  type Division,
  type ReportStatus,
} from '@edtc/shared'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { SelectField } from '~/components/ui/Field'
import { CheckIcon, SaveIcon, SendIcon, TrashIcon } from '~/components/ui/Icons'
import { formatTimestamp, fullName } from '~/lib/format'
import type { FormErrors } from '~/lib/form'
import type { Autosave } from './autosave'
import { CharCount } from './CharCount'
import { byPosition, sameContent, type ReportContent } from './content'
import { RequestCard } from './InlineComment'
import { MarkedTextarea } from './MarkedTextarea'
import { RatingSlider } from './Rating'
import { ReportInfo } from './ReportInfo'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { ApproverCandidate, ReportComment, ReportContext, ReportReview } from './types'

export type ReportIntent = 'save' | 'submit' | 'delete' | 'review' | 'withdraw'
export type ReportActionData = (FormErrors & { intent: ReportIntent }) | { ok: true; intent: ReportIntent }

type Props = {
  context: ReportContext
  initial: ReportContent
  /** 作成ページではまだ報告書がないので draft 扱い */
  status: ReportStatus
  /** 本人の所属部署（プロフィール） */
  divisions: Division[]
  canDelete: boolean
  /** いちばん新しい差し戻し */
  rejection?: ReportReview
  /** 右側の列に追加で出すもの（承認の流れ・履歴） */
  aside?: ReactNode
  /** 役職者（部署長・本部長・代表）なら承認者を選ぶ */
  isLeader: boolean
  /** 承認者の候補（自分以外の部署長・本部長・代表） */
  approvers: ApproverCandidate[]
  /** ほかのページへ移るときに、未保存の変更を保存する */
  autosave: Autosave
}

/** 修正依頼の範囲を、いまの本文の中で探す（位置がずれていれば引用文で探し直す） */
function locate(value: string, comment: ReportComment): { start: number; end: number } | null {
  if (value.slice(comment.start, comment.end) === comment.quote) return { start: comment.start, end: comment.end }
  const index = value.indexOf(comment.quote)
  return index >= 0 ? { start: index, end: index + comment.quote.length } : null
}

export function ReportForm({ context, initial, status, divisions, canDelete, rejection, aside, isLeader, approvers, autosave }: Props) {
  const [content, setContent] = useState<ReportContent>(initial)
  const fetcher = useFetcher<ReportActionData>()
  const pendingIntent = fetcher.state === 'idle' ? null : (fetcher.json as { intent?: ReportIntent } | undefined)?.intent
  const dirty = !sameContent(content, initial)
  const fieldErrors = fetcher.data && 'fieldErrors' in fetcher.data ? (fetcher.data.fieldErrors ?? {}) : {}
  const check = reportSubmitSchema.safeParse(content)
  const problems = [
    ...new Set([
      ...(check.success ? [] : check.error.issues.map((issue) => issue.message)),
      ...(isLeader && !content.approverId ? ['承認者を選んでください'] : []),
    ]),
  ]
  const rejected = status === 'rejected' && !!rejection
  const divisionOptions = content.division && !divisions.includes(content.division) ? [...divisions, content.division] : divisions
  const textareas = useRef<Partial<Record<CommentableField, HTMLTextAreaElement | null>>>({})

  const set = <K extends keyof ReportContent>(key: K, value: ReportContent[K]) => setContent((prev) => ({ ...prev, [key]: value }))
  const send = (intent: ReportIntent) => fetcher.submit({ intent, content }, { method: 'post', encType: 'application/json' })

  // 修正依頼（いちばん新しい差し戻し）。番号は項目の順・本文の位置の順
  const requests = rejected ? [...rejection.comments].sort(byPosition) : []
  const [applied, setApplied] = useState<ReadonlySet<string>>(new Set())
  const requestsFor = (field: CommentableField) => requests.filter((r) => r.field === field)
  /** まだ対応していない依頼の、いまの本文での位置 */
  const openRanges = (field: CommentableField) =>
    requestsFor(field)
      .filter((r) => !applied.has(r.id))
      .map((r) => locate(content[field], r))
      .filter((range) => range !== null)

  const label = (field: CommentableField) => {
    const count = requestsFor(field).filter((r) => !applied.has(r.id) && locate(content[field], r)).length
    return (
      <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
        {REPORT_FIELD_LABELS[field]}
        {count > 0 && <Badge tone="danger">修正依頼 {count}</Badge>}
      </span>
    )
  }

  const selectInField = (field: CommentableField, range: { start: number; end: number }) => {
    const textarea = textareas.current[field]
    if (!textarea) return
    textarea.focus()
    textarea.setSelectionRange(range.start, range.end)
  }

  /** 書き直し案をそのまま本文に反映する */
  const applySuggestion = (field: CommentableField, request: ReportComment, range: { start: number; end: number }) => {
    const value = content[field]
    set(field, value.slice(0, range.start) + (request.suggestion ?? '') + value.slice(range.end))
    setApplied((prev) => new Set(prev).add(request.id))
  }

  const requestCards = (field: CommentableField) => {
    const list = requestsFor(field)
    if (list.length === 0) return null
    return (
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
        {list.map((request) => {
          const range = applied.has(request.id) ? null : locate(content[field], request)
          return (
            <RequestCard
              key={request.id}
              number={requests.indexOf(request) + 1}
              quote={request.quote}
              suggestion={request.suggestion}
              body={request.body}
              state={applied.has(request.id) ? 'applied' : range ? 'open' : 'outdated'}
              actions={
                range && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => selectInField(field, range)}>
                      該当箇所を選択
                    </Button>
                    {request.suggestion !== null && (
                      <Button size="sm" variant="primary" onClick={() => applySuggestion(field, request, range)}>
                        <CheckIcon size={14} />
                        反映
                      </Button>
                    )}
                  </>
                )
              }
            />
          )
        })}
      </div>
    )
  }

  // 未保存のままほかのページへ移ろうとしたら（戻るボタンも含む）、自動で保存してから移る。
  // 保存・提出の後の移動は対象外。保存できなかったら移動をやめて理由を出す
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && fetcher.state === 'idle' && currentLocation.pathname !== nextLocation.pathname,
  )
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const autosaving = useRef(false)
  useEffect(() => {
    if (blocker.state !== 'blocked' || autosaving.current) return
    autosaving.current = true
    autosave(content).then((error) => {
      autosaving.current = false
      if (error) {
        setAutosaveError(error)
        blocker.reset()
      } else {
        blocker.proceed()
      }
    })
  }, [blocker, autosave, content])

  // タブを閉じる・再読み込みは自動保存できないので、ブラウザの確認を出す
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const textarea = (field: CommentableField, props: { rows: number; placeholder: string; required?: boolean; hint: ReactNode }) => (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
      <MarkedTextarea
        textareaRef={(el) => {
          textareas.current[field] = el
        }}
        label={label(field)}
        value={content[field]}
        onChange={(value) => set(field, value)}
        marks={openRanges(field)}
        error={fieldErrors[field]}
        {...props}
      />
      {requestCards(field)}
    </div>
  )

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
      {blocker.state === 'blocked' && <Alert tone="info">変更を下書きに保存しています…</Alert>}
      {autosaveError && blocker.state !== 'blocked' && (
        <Alert tone="warning">
          {`自動保存できなかったため、ページを移動しませんでした。\n${autosaveError}`}
          <span className={css({ display: 'inline-flex', gap: 'sm', ml: 'md' })}>
            <Button size="sm" onClick={() => setAutosaveError(null)}>
              閉じる
            </Button>
          </span>
        </Alert>
      )}
      {rejected && (
        <Alert tone="warning">
          <strong>
            {rejection.reviewer ? `${fullName(rejection.reviewer)}さんから` : ''}修正依頼（{formatTimestamp(rejection.createdAt)}）
          </strong>
          {rejection.comment && `\n${rejection.comment}`}
        </Alert>
      )}
      {fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data && fetcher.data.error && <Alert>{fetcher.data.error}</Alert>}

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
        <Card title="報告内容">
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
            <SelectField
              label={REPORT_FIELD_LABELS.division}
              value={content.division ?? ''}
              onChange={(e) => set('division', (e.currentTarget.value || null) as Division | null)}
              required
              error={fieldErrors.division}
              className={css({ maxW: '240px' })}
            >
              <option value="">選んでください</option>
              {divisionOptions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </SelectField>
            {isLeader && (
              <SelectField
                label="承認者"
                value={content.approverId ?? ''}
                onChange={(e) => set('approverId', e.currentTarget.value || null)}
                required
                error={fieldErrors.approverId}
                className={css({ maxW: '360px' })}
              >
                <option value="">選んでください</option>
                {approvers.map((approver) => (
                  <option key={approver.id} value={approver.id}>
                    {fullName(approver)}（{approver.positions.join('・')}）
                  </option>
                ))}
              </SelectField>
            )}
            {textarea('content', {
              rows: 5,
              required: true,
              placeholder: '当日行ったこと（担当した作業・進行など）',
              hint: <CharCount value={content.content} max={REPORT_LIMITS.content.max} />,
            })}
            {textarea('reflection', {
              rows: 10,
              required: true,
              placeholder: '良かった点・反省点・次回に向けて改善したいこと',
              hint: <CharCount value={content.reflection} max={REPORT_LIMITS.reflection.max} />,
            })}
            <RatingSlider label={REPORT_FIELD_LABELS.rating} value={content.rating} onChange={(rating) => set('rating', rating)} error={fieldErrors.rating} />
            {textarea('notes', {
              rows: 3,
              placeholder: '次回の担当者への引き継ぎ、忘れ物、備品の不具合など（任意）',
              hint: <CharCount value={content.notes} max={REPORT_LIMITS.notes.max} />,
            })}
          </div>
        </Card>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <Card title="提出">
            <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
                <ReportStatusBadge status={status} />
                <span className={css({ flex: 1, color: dirty ? 'warning.fg' : 'fg.subtle' })}>
                  {dirty ? '未保存' : '保存済み'}
                </span>
                {canDelete && (
                  <Button variant="ghost" size="sm" loading={pendingIntent === 'delete'} onClick={() => confirm('この下書きを削除しますか？') && send('delete')}>
                    <TrashIcon size={14} />
                    削除
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAutosaveError(null)
                    send('save')
                  }}
                  loading={pendingIntent === 'save'}
                  disabled={!dirty}
                >
                  <SaveIcon size={14} />
                  下書き保存
                </Button>
              </div>
              {problems.length > 0 && (
                <div>
                  <ul className={css({ display: 'flex', flexDirection: 'column', gap: '2px', color: 'warning.fg', listStyle: 'disc', pl: 'lg' })}>
                    {problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="primary" onClick={() => send('submit')} loading={pendingIntent === 'submit'} disabled={problems.length > 0}>
                <SendIcon size={16} />
                {rejected ? '再提出' : '提出'}
              </Button>
            </div>
          </Card>
          {aside}
          <ReportInfo context={context} />
        </div>
      </div>
    </div>
  )
}
