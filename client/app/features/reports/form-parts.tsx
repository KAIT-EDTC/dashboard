import type { CommentableField, Division, ReportStatus } from '@edtc/shared'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { SelectField } from '~/components/ui/Field'
import { CheckIcon, SaveIcon, SendIcon, TrashIcon } from '~/components/ui/Icons'
import { formatTimestamp, fullName } from '~/lib/format'
import type { Autosave } from './autosave'
import { byPosition } from './content'
import { RequestCard } from './InlineComment'
import { MarkedTextarea } from './MarkedTextarea'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { ApproverCandidate, ReportComment, ReportReview } from './types'

/** 活動報告書・まとめ報告書の入力フォームで共通の部品 */

export type ReportIntent = 'save' | 'submit' | 'delete' | 'review' | 'withdraw'

/**
 * 未保存のままほかのページへ移ろうとしたら（戻るボタンも含む）、自動で保存してから移る。
 * 保存・提出の後の移動は対象外。保存できなかったら移動をやめて理由を出す。
 * タブを閉じる・再読み込みは自動保存できないので、ブラウザの確認を出す
 */
export function useAutosaveOnLeave<T>({ dirty, idle, content, autosave }: { dirty: boolean; idle: boolean; content: T; autosave: Autosave<T> }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && idle && currentLocation.pathname !== nextLocation.pathname)
  const [error, setError] = useState<string | null>(null)
  const autosaving = useRef(false)
  useEffect(() => {
    if (blocker.state !== 'blocked' || autosaving.current) return
    autosaving.current = true
    autosave(content).then((message) => {
      autosaving.current = false
      if (message) {
        setError(message)
        blocker.reset()
      } else {
        blocker.proceed()
      }
    })
  }, [blocker, autosave, content])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return { saving: blocker.state === 'blocked', error, clearError: () => setError(null) }
}

/** 修正依頼の範囲を、いまの本文の中で探す（位置がずれていれば引用文で探し直す） */
function locate(value: string, comment: ReportComment): { start: number; end: number } | null {
  if (value.slice(comment.start, comment.end) === comment.quote) return { start: comment.start, end: comment.end }
  const index = value.indexOf(comment.quote)
  return index >= 0 ? { start: index, end: index + comment.quote.length } : null
}

/**
 * 修正依頼（いちばん新しい差し戻し）を、本文の赤い印と依頼カードにする。
 * 番号は項目の順・本文の位置の順。書き直し案は「反映」で本文に入る
 */
export function useRevisionRequests<F extends CommentableField>({
  rejection,
  value,
  update,
}: {
  rejection: ReportReview | undefined
  value: (field: F) => string
  update: (field: F, value: string) => void
}) {
  const requests = rejection ? [...rejection.comments].sort(byPosition) : []
  const [applied, setApplied] = useState<ReadonlySet<string>>(new Set())
  const textareas = useRef<Partial<Record<F, HTMLTextAreaElement | null>>>({})
  const requestsFor = (field: F) => requests.filter((r) => r.field === field)
  const openRanges = (field: F) =>
    requestsFor(field)
      .filter((r) => !applied.has(r.id))
      .map((r) => locate(value(field), r))
      .filter((range) => range !== null)

  const selectInField = (field: F, range: { start: number; end: number }) => {
    const textarea = textareas.current[field]
    if (!textarea) return
    textarea.focus()
    textarea.setSelectionRange(range.start, range.end)
  }

  const label = (field: F, text: string) => {
    const count = openRanges(field).length
    return (
      <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
        {text}
        {count > 0 && <Badge tone="danger">修正依頼 {count}</Badge>}
      </span>
    )
  }

  const cards = (field: F) => {
    const list = requestsFor(field)
    if (list.length === 0) return null
    return (
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
        {list.map((request) => {
          const range = applied.has(request.id) ? null : locate(value(field), request)
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
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const current = value(field)
                          update(field, current.slice(0, range.start) + (request.suggestion ?? '') + current.slice(range.end))
                          setApplied((prev) => new Set(prev).add(request.id))
                        }}
                      >
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

  /** 修正依頼の印と依頼カードが付いた入力欄 */
  const textarea = (
    field: F,
    props: { label: string; rows: number; placeholder?: string; required?: boolean; hint: ReactNode; error?: string },
  ) => (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
      <MarkedTextarea
        textareaRef={(el) => {
          textareas.current[field] = el
        }}
        label={label(field, props.label)}
        value={value(field)}
        onChange={(next) => update(field, next)}
        marks={openRanges(field)}
        rows={props.rows}
        placeholder={props.placeholder}
        required={props.required}
        error={props.error}
        hint={props.hint}
      />
      {cards(field)}
    </div>
  )

  return { textarea }
}

/** フォームの上に出す知らせ（自動保存中・自動保存の失敗・修正依頼・送信エラー） */
export function FormAlerts({
  autosave,
  rejection,
  error,
}: {
  autosave: { saving: boolean; error: string | null; clearError: () => void }
  rejection?: ReportReview
  error?: string
}) {
  return (
    <>
      {autosave.saving && <Alert tone="info">変更を下書きに保存しています…</Alert>}
      {autosave.error && !autosave.saving && (
        <Alert tone="warning">
          {`自動保存できなかったため、ページを移動しませんでした。\n${autosave.error}`}
          <span className={css({ display: 'inline-flex', gap: 'sm', ml: 'md' })}>
            <Button size="sm" onClick={autosave.clearError}>
              閉じる
            </Button>
          </span>
        </Alert>
      )}
      {rejection && (
        <Alert tone="warning">
          <strong>
            {rejection.reviewer ? `${fullName(rejection.reviewer)}さんから` : ''}修正依頼（{formatTimestamp(rejection.createdAt)}）
          </strong>
          {rejection.comment && `\n${rejection.comment}`}
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
    </>
  )
}

/** 提出のカード（状態・下書き保存・削除・提出できない理由・提出ボタン） */
export function SubmitCard({
  status,
  dirty,
  canDelete,
  pendingIntent,
  problems,
  resubmit,
  onSend,
  children,
}: {
  status: ReportStatus
  dirty: boolean
  canDelete: boolean
  pendingIntent: ReportIntent | null | undefined
  problems: string[]
  resubmit: boolean
  onSend: (intent: ReportIntent) => void
  /** 提出ボタンの上に出すもの */
  children?: ReactNode
}) {
  return (
    <Card title="提出">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
          <ReportStatusBadge status={status} />
          <span className={css({ flex: 1, color: dirty ? 'warning.fg' : 'fg.subtle' })}>{dirty ? '未保存' : '保存済み'}</span>
          {canDelete && (
            <Button variant="ghost" size="sm" loading={pendingIntent === 'delete'} onClick={() => confirm('この下書きを削除しますか？') && onSend('delete')}>
              <TrashIcon size={14} />
              削除
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => onSend('save')} loading={pendingIntent === 'save'} disabled={!dirty}>
            <SaveIcon size={14} />
            下書き保存
          </Button>
        </div>
        {children}
        {problems.length > 0 && (
          <ul className={css({ display: 'flex', flexDirection: 'column', gap: '2px', color: 'warning.fg', listStyle: 'disc', pl: 'lg' })}>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        <Button variant="primary" onClick={() => onSend('submit')} loading={pendingIntent === 'submit'} disabled={problems.length > 0}>
          <SendIcon size={16} />
          {resubmit ? '再提出' : '提出'}
        </Button>
      </div>
    </Card>
  )
}

/** 所属部署と、役職者なら承認者 */
export function DivisionApproverFields({
  division,
  approverId,
  divisions,
  isLeader,
  approvers,
  errors,
  onChange,
}: {
  division: Division | null
  approverId: string | null
  /** 本人の所属部署（プロフィール） */
  divisions: Division[]
  isLeader: boolean
  approvers: ApproverCandidate[]
  errors: Record<string, string>
  onChange: (next: { division?: Division | null; approverId?: string | null }) => void
}) {
  const options = division && !divisions.includes(division) ? [...divisions, division] : divisions
  return (
    <>
      <SelectField
        label="所属部署"
        value={division ?? ''}
        onChange={(e) => onChange({ division: (e.currentTarget.value || null) as Division | null })}
        required
        error={errors.division}
        className={css({ maxW: '240px' })}
      >
        <option value="">選んでください</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </SelectField>
      {isLeader && (
        <SelectField
          label="承認者"
          value={approverId ?? ''}
          onChange={(e) => onChange({ approverId: e.currentTarget.value || null })}
          required
          error={errors.approverId}
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
    </>
  )
}
