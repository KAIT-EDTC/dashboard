import {
  REPORT_FIELD_LABELS,
  REPORT_LIMITS,
  reportSubmitSchema,
  type Division,
  type ReportField,
} from '@edtc/shared'
import { useEffect, useState } from 'react'
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
import { CharCount } from './CharCount'
import { contentOf, sameContent, type ReportContent } from './content'
import { RatingSlider } from './Rating'
import { ReportInfo } from './ReportInfo'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { ReportDetailResponse } from './types'

export type ReportIntent = 'save' | 'submit' | 'delete' | 'review'
export type ReportActionData = (FormErrors & { intent: ReportIntent }) | { ok: true; intent: ReportIntent }

type Props = ReportDetailResponse & {
  /** 本人の所属部署（プロフィール） */
  divisions: Division[]
}

export function ReportForm({ report, authorRole, canDelete, divisions }: Props) {
  const [content, setContent] = useState<ReportContent>(() => contentOf(report))
  const fetcher = useFetcher<ReportActionData>()
  const pendingIntent = fetcher.state === 'idle' ? null : (fetcher.json as { intent?: ReportIntent } | undefined)?.intent
  const dirty = !sameContent(content, contentOf(report))
  const fieldErrors = fetcher.data && 'fieldErrors' in fetcher.data ? (fetcher.data.fieldErrors ?? {}) : {}
  const check = reportSubmitSchema.safeParse(content)
  const problems = check.success ? [] : [...new Set(check.error.issues.map((issue) => issue.message))]
  const rejected = report.status === 'rejected'
  const divisionOptions = report.division && !divisions.includes(report.division) ? [...divisions, report.division] : divisions

  const set = <K extends keyof ReportContent>(key: K, value: ReportContent[K]) => setContent((prev) => ({ ...prev, [key]: value }))
  const send = (intent: ReportIntent) => fetcher.submit({ intent, content }, { method: 'post', encType: 'application/json' })

  /** 差し戻しで指摘された項目には印を付ける */
  const label = (field: ReportField) => (
    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm' })}>
      {REPORT_FIELD_LABELS[field]}
      {rejected && report.rejectionFields.includes(field) && <Badge tone="danger">要修正</Badge>}
    </span>
  )

  // 未保存のまま離れようとしたら確認する
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
      {blocker.state === 'blocked' && (
        <Alert tone="warning">
          保存していない変更があります。
          <span className={css({ display: 'inline-flex', gap: 'sm', ml: 'md' })}>
            <Button size="sm" onClick={() => blocker.reset()}>編集に戻る</Button>
            <Button size="sm" variant="danger" onClick={() => blocker.proceed()}>破棄して移動</Button>
          </span>
        </Alert>
      )}
      {rejected && (
        <Alert tone="warning">
          <strong>
            {report.reviewer ? `${fullName(report.reviewer)}さんから` : ''}差し戻されました
            {report.reviewedAt && `（${formatTimestamp(report.reviewedAt)}）`}
          </strong>
          {'\n'}直してほしい項目: {report.rejectionFields.map((field) => REPORT_FIELD_LABELS[field]).join('、')}
          {'\n'}
          {report.rejectionComment}
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
              hint="この部署の部長に確認が届きます"
              className={css({ maxW: '240px' })}
            >
              <option value="">選んでください</option>
              {divisionOptions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </SelectField>
            <TextareaField
              label={label('content')}
              value={content.content}
              onChange={(e) => set('content', e.currentTarget.value)}
              rows={5}
              required
              placeholder="当日行ったこと（担当した作業・進行など）"
              error={fieldErrors.content}
              hint={<CharCount value={content.content} max={REPORT_LIMITS.content.max} />}
            />
            <TextareaField
              label={label('reflection')}
              value={content.reflection}
              onChange={(e) => set('reflection', e.currentTarget.value)}
              rows={10}
              required
              placeholder="良かった点・反省点・次回に向けて改善したいこと"
              error={fieldErrors.reflection}
              hint={<CharCount value={content.reflection} min={REPORT_LIMITS.reflection.min} max={REPORT_LIMITS.reflection.max} />}
            />
            <RatingSlider label={label('rating')} value={content.rating} onChange={(rating) => set('rating', rating)} error={fieldErrors.rating} />
            <TextareaField
              label={label('notes')}
              value={content.notes}
              onChange={(e) => set('notes', e.currentTarget.value)}
              rows={3}
              placeholder="次回の担当者への引き継ぎ、忘れ物、備品の不具合など（任意）"
              error={fieldErrors.notes}
              hint={
                <>
                  承認されるとイベントページの「連絡事項」に表示されます
                  <CharCount value={content.notes} max={REPORT_LIMITS.notes.max} />
                </>
              }
            />
          </div>
        </Card>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <ReportInfo report={report} authorRole={authorRole} />
          <Card title="提出">
            <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
                <ReportStatusBadge status={report.status} />
                <span className={css({ flex: 1, color: dirty ? 'warning.fg' : 'fg.subtle' })}>{dirty ? '未保存の変更があります' : '保存済み'}</span>
                {canDelete && (
                  <Button variant="ghost" size="sm" loading={pendingIntent === 'delete'} onClick={() => confirm('この下書きを削除しますか？') && send('delete')}>
                    <TrashIcon size={14} />
                    削除
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => send('save')} loading={pendingIntent === 'save'} disabled={!dirty}>
                  <SaveIcon size={14} />
                  下書き保存
                </Button>
              </div>
              <p className={css({ color: 'fg.muted' })}>
                提出すると所属部署の部長に確認が届きます（Discordで通知）。承認されるとイベントページに載ります。
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
        </div>
      </div>
    </div>
  )
}
