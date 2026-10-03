import { REPORT_FIELD_LABELS, REPORT_LIMITS, reportSubmitSchema, type Division, type ReportStatus } from '@edtc/shared'
import { useState, type ReactNode } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Card } from '~/components/ui/Card'
import type { FormErrors } from '~/lib/form'
import type { Autosave } from './autosave'
import { CharCount } from './CharCount'
import { sameContent, type ReportContent } from './content'
import { DivisionApproverFields, FormAlerts, SubmitCard, useAutosaveOnLeave, useRevisionRequests, type ReportIntent } from './form-parts'
import { RatingInput } from './Rating'
import { ReportInfo } from './ReportInfo'
import type { ApproverCandidate, ReportContext, ReportReview } from './types'

export type { ReportIntent } from './form-parts'
export type ReportActionData = (FormErrors & { intent: ReportIntent }) | { ok: true; intent: ReportIntent }

/** 活動報告書の、範囲コメントできる項目 */
type ActivityField = 'content' | 'reflection' | 'notes'

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

  const set = <K extends keyof ReportContent>(key: K, value: ReportContent[K]) => setContent((prev) => ({ ...prev, [key]: value }))
  const leave = useAutosaveOnLeave({ dirty, idle: fetcher.state === 'idle', content, autosave })
  const send = (intent: ReportIntent) => {
    if (intent === 'save') leave.clearError()
    fetcher.submit({ intent, content }, { method: 'post', encType: 'application/json' })
  }
  const { textarea } = useRevisionRequests<ActivityField>({
    rejection: rejected ? rejection : undefined,
    value: (field) => content[field],
    update: (field, value) => set(field, value),
  })
  const field = (name: ActivityField, props: { rows: number; placeholder: string; required?: boolean; max: number }) =>
    textarea(name, {
      label: REPORT_FIELD_LABELS[name],
      rows: props.rows,
      placeholder: props.placeholder,
      required: props.required,
      error: fieldErrors[name],
      hint: <CharCount value={content[name]} max={props.max} />,
    })

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
      <FormAlerts
        autosave={leave}
        rejection={rejected ? rejection : undefined}
        error={fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined}
      />

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
        <Card title="報告内容">
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
            <DivisionApproverFields
              division={content.division}
              approverId={content.approverId}
              divisions={divisions}
              isLeader={isLeader}
              approvers={approvers}
              errors={fieldErrors}
              onChange={(next) => setContent((prev) => ({ ...prev, ...next }))}
            />
            {field('content', { rows: 5, required: true, placeholder: '当日行ったこと（担当した作業・進行など）', max: REPORT_LIMITS.content.max })}
            {field('reflection', { rows: 10, required: true, placeholder: '良かった点・反省点・次回に向けて改善したいこと', max: REPORT_LIMITS.reflection.max })}
            <RatingInput label={REPORT_FIELD_LABELS.rating} value={content.rating} onChange={(rating) => set('rating', rating)} error={fieldErrors.rating} />
            {field('notes', { rows: 3, placeholder: '次回の担当者への引き継ぎ、忘れ物、備品の不具合など（任意）', max: REPORT_LIMITS.notes.max })}
          </div>
        </Card>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <SubmitCard status={status} dirty={dirty} canDelete={canDelete} pendingIntent={pendingIntent} problems={problems} resubmit={rejected} onSend={send} />
          {aside}
          <ReportInfo context={context} />
        </div>
      </div>
    </div>
  )
}
