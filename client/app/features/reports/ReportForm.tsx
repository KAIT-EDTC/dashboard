import {
  APPROVAL_STEP_LABELS,
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
import { SelectField, TextareaField } from '~/components/ui/Field'
import { SaveIcon, SendIcon, TrashIcon } from '~/components/ui/Icons'
import { formatTimestamp, fullName } from '~/lib/format'
import type { FormErrors } from '~/lib/form'
import type { Autosave } from './autosave'
import { CharCount } from './CharCount'
import { sameContent, type ReportContent } from './content'
import { InlineCommentItem } from './InlineComment'
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

/** 差し戻しコメントの範囲を、直したあとの本文の中で探す（位置がずれていれば引用文で探し直す） */
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

  const commentsFor = (field: CommentableField) => (rejected ? rejection.comments.filter((c) => c.field === field) : [])
  const label = (field: CommentableField | 'division') => {
    const count = field === 'division' ? 0 : commentsFor(field).length
    return (
      <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
        {REPORT_FIELD_LABELS[field]}
        {count > 0 && <Badge tone="danger">コメント {count}件</Badge>}
      </span>
    )
  }

  /** 差し戻しコメントの範囲を入力欄で選択する */
  const selectInField = (field: CommentableField, comment: ReportComment) => {
    const textarea = textareas.current[field]
    const range = locate(content[field], comment)
    if (!textarea || !range) return
    textarea.focus()
    textarea.setSelectionRange(range.start, range.end)
  }

  const comments = (field: CommentableField) => {
    const list = commentsFor(field)
    if (list.length === 0) return null
    return (
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
        {list.map((comment) => {
          const found = !!locate(content[field], comment)
          return (
            <InlineCommentItem
              key={comment.id}
              quote={comment.quote}
              body={comment.body}
              action={
                found ? (
                  <Button size="sm" variant="ghost" onClick={() => selectInField(field, comment)}>
                    本文で選択
                  </Button>
                ) : (
                  <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>この箇所は書き換え済みです</span>
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
      <TextareaField
        ref={(el) => {
          textareas.current[field] = el
        }}
        label={label(field)}
        value={content[field]}
        onChange={(e) => set(field, e.currentTarget.value)}
        error={fieldErrors[field]}
        {...props}
      />
      {comments(field)}
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
            {rejection.reviewer ? `${fullName(rejection.reviewer)}さん（${APPROVAL_STEP_LABELS[rejection.step]}）から` : ''}差し戻されました（
            {formatTimestamp(rejection.createdAt)}）
          </strong>
          {rejection.comment && `\n${rejection.comment}`}
          {rejection.comments.length > 0 && `\n本文へのコメントが ${rejection.comments.length}件 あります（各項目の下に表示しています）。`}
        </Alert>
      )}
      {fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data && fetcher.data.error && <Alert>{fetcher.data.error}</Alert>}

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
        <Card title="報告内容">
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
            <SelectField
              label={label('division')}
              value={content.division ?? ''}
              onChange={(e) => set('division', (e.currentTarget.value || null) as Division | null)}
              required
              error={fieldErrors.division}
              hint={isLeader ? undefined : 'この部署の部署長に確認が届きます'}
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
                hint="役職者の報告書は、自分以外の部署長・本部長・代表から1人選んで承認してもらいます"
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
              hint: (
                <>
                  承認されるとイベントページの「連絡事項」に表示されます
                  <CharCount value={content.notes} max={REPORT_LIMITS.notes.max} />
                </>
              ),
            })}
          </div>
        </Card>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <Card title="提出">
            <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
                <ReportStatusBadge status={status} />
                <span className={css({ flex: 1, color: dirty ? 'warning.fg' : 'fg.subtle' })}>
                  {dirty ? '未保存の変更があります（ほかのページへ移ると自動で保存）' : '保存済み'}
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
              <p className={css({ color: 'fg.muted' })}>
                {isLeader
                  ? '提出すると、選んだ承認者に確認が届きます（DiscordのDMで通知）。'
                  : '提出すると、所属部署の部署長に確認が届きます（DiscordのDMで通知）。'}
                承認されるとイベントページに載ります。
              </p>
              {problems.length > 0 && (
                <div>
                  <p className={css({ fontWeight: '600', mb: 'xs' })}>提出前に必要なこと</p>
                  <ul className={css({ display: 'flex', flexDirection: 'column', gap: '2px', color: 'warning.fg', listStyle: 'disc', pl: 'lg' })}>
                    {problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="primary" onClick={() => send('submit')} loading={pendingIntent === 'submit'} disabled={problems.length > 0}>
                <SendIcon size={16} />
                {rejected ? '修正して再提出' : '提出する'}
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
