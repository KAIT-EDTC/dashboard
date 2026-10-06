import { HOSTING_LABELS, HOSTINGS, SUMMARY_FIELD_LABELS, SUMMARY_LIMITS, summarySubmitSchema, type Division, type ReportStatus } from '@edtc/shared'
import { useState, type ReactNode } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { TextareaField } from '~/components/ui/Field'
import { RoleBadge } from '~/features/events/EventBadges'
import { fullName } from '~/lib/format'
import type { Autosave } from './autosave'
import { CharCount } from './CharCount'
import { sameContent, type SummaryContent } from './content'
import { DivisionApproverFields, FormAlerts, SubmitCard, useAutosaveOnLeave, useRevisionRequests, type ReportIntent } from './form-parts'
import { choiceStyle, RatingInput, RatingMeter } from './Rating'
import type { ReportActionData } from './ReportForm'
import { ReportInfo } from './ReportInfo'
import { ReportStatusBadge } from './ReportStatusBadge'
import { hasSubmitted, type ApproverCandidate, type ReportContext, type ReportReview, type SummaryMember } from './types'

/** まとめ報告書の、範囲コメントできる項目 */
type SummaryTextField = 'content' | 'overview' | 'impressions' | 'notes'

type Props = {
  context: ReportContext
  initial: SummaryContent
  /** 参加者と、それぞれの活動報告書の提出状況・評価・事後報告 */
  members: SummaryMember[]
  /** 作成ページではまだないので draft 扱い */
  status: ReportStatus
  divisions: Division[]
  canDelete: boolean
  rejection?: ReportReview
  aside?: ReactNode
  isLeader: boolean
  approvers: ApproverCandidate[]
  autosave: Autosave<SummaryContent>
}

/** 自己分析を参加者の並びにそろえる（あとから参加者が増えても欄が出るように） */
function withMembers(content: SummaryContent, members: SummaryMember[]): SummaryContent {
  return {
    ...content,
    analyses: members.map((m) => ({ userId: m.user.id, text: content.analyses.find((a) => a.userId === m.user.id)?.text ?? '' })),
  }
}

/** 参加者1人分の自己分析。評価と提出状況は本人の活動報告書から */
function AnalysisInput({
  member,
  value,
  rating,
  error,
  onChange,
}: {
  member: SummaryMember
  value: string
  rating: number | null
  error?: string
  onChange: (value: string) => void
}) {
  const reflection = member.report?.reflection
  return (
    <li className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', py: 'md', borderTopWidth: '1px', _first: { borderTopWidth: '0', pt: '0' } })}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm' })}>
        <Avatar user={member.user} size={24} />
        <span className={css({ fontSize: 'sm', fontWeight: '600' })}>{fullName(member.user)}</span>
        {member.role && <RoleBadge role={member.role} />}
        {member.isWriter && !member.report ? <Badge tone="accent">担当者</Badge> : <ReportStatusBadge status={member.report?.status ?? null} emptyLabel="未提出" />}
        <span className={css({ ml: 'auto' })}>
          <RatingMeter value={rating} />
        </span>
      </div>
      <TextareaField
        label={<span className={css({ srOnly: true })}>{fullName(member.user)}の自己分析</span>}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        rows={3}
        error={error}
        hint={
          <span className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
            {reflection && value.trim() !== reflection.trim() && (
              <Button size="sm" variant="ghost" onClick={() => (!value.trim() || confirm('入力した内容を事後報告で置き換えますか？')) && onChange(reflection)}>
                事後報告を入れる
              </Button>
            )}
            <span className={css({ ml: 'auto' })}>
              <CharCount value={value} max={SUMMARY_LIMITS.analysis.max} />
            </span>
          </span>
        }
      />
    </li>
  )
}

export function SummaryForm({ context, initial: rawInitial, members, status, divisions, canDelete, rejection, aside, isLeader, approvers, autosave }: Props) {
  const [initial] = useState(() => withMembers(rawInitial, members))
  const [content, setContent] = useState<SummaryContent>(initial)
  const fetcher = useFetcher<ReportActionData>()
  const pendingIntent = fetcher.state === 'idle' ? null : (fetcher.json as { intent?: ReportIntent } | undefined)?.intent
  const dirty = !sameContent(content, initial)
  const fieldErrors = fetcher.data && 'fieldErrors' in fetcher.data ? (fetcher.data.fieldErrors ?? {}) : {}
  const rejected = status === 'rejected' && !!rejection

  // 担当者は活動報告書を書かなくてよい
  const required = members.filter((m) => !m.isWriter)
  const submitted = required.filter(hasSubmitted).length
  const check = summarySubmitSchema.safeParse(content)
  const problems = [
    ...new Set([
      ...(submitted < required.length ? [`活動報告書を提出していない参加者がいます（${submitted} / ${required.length}人）`] : []),
      ...(check.success ? [] : check.error.issues.map((issue) => issue.message)),
      ...(content.analyses.some((a) => !a.text.trim()) ? ['自己分析を入力していない参加者がいます'] : []),
      ...(isLeader && !content.approverId ? ['承認者を選んでください'] : []),
    ]),
  ]

  const set = <K extends keyof SummaryContent>(key: K, value: SummaryContent[K]) => setContent((prev) => ({ ...prev, [key]: value }))
  const setAnalysis = (userId: string, text: string) =>
    setContent((prev) => ({ ...prev, analyses: prev.analyses.map((a) => (a.userId === userId ? { ...a, text } : a)) }))
  const leave = useAutosaveOnLeave({ dirty, idle: fetcher.state === 'idle', content, autosave })
  const send = (intent: ReportIntent) => {
    if (intent === 'save') leave.clearError()
    fetcher.submit({ intent, kind: 'summary', content }, { method: 'post', encType: 'application/json' })
  }
  const { textarea } = useRevisionRequests<SummaryTextField>({
    rejection: rejected ? rejection : undefined,
    value: (field) => content[field],
    update: (field, value) => set(field, value),
  })
  const field = (name: SummaryTextField, props: { rows: number; placeholder?: string; required?: boolean; max: number }) =>
    textarea(name, {
      label: SUMMARY_FIELD_LABELS[name],
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
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', minW: 0 })}>
          <Card title="活動概要">
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
              {field('content', { rows: 3, required: true, placeholder: `1行に1つ（${SUMMARY_LIMITS.content.lines}行まで）`, max: SUMMARY_LIMITS.content.max })}
              <fieldset>
                <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>
                  {SUMMARY_FIELD_LABELS.hosting}
                  <span className={css({ color: 'danger', ml: '2px' })}>*</span>
                </legend>
                <div className={css({ display: 'flex', gap: 'sm', maxW: '240px' })}>
                  {HOSTINGS.map((hosting) => (
                    <label key={hosting} className={choiceStyle}>
                      <input
                        type="radio"
                        name="hosting"
                        value={hosting}
                        checked={content.hosting === hosting}
                        onChange={() => set('hosting', hosting)}
                        className={css({ srOnly: true })}
                      />
                      {HOSTING_LABELS[hosting]}
                    </label>
                  ))}
                </div>
                {fieldErrors.hosting && <p className={css({ fontSize: 'xs', color: 'danger.fg', mt: '6px' })}>{fieldErrors.hosting}</p>}
              </fieldset>
            </div>
          </Card>

          <Card
            title={SUMMARY_FIELD_LABELS.analyses}
            action={
              <Badge tone={submitted === required.length ? 'success' : 'warning'}>
                活動報告書 提出 {submitted} / {required.length}人
              </Badge>
            }
          >
            {members.length === 0 ? (
              <p className={css({ fontSize: 'sm', color: 'fg.subtle' })}>参加者がいません</p>
            ) : (
              <ul>
                {members.map((member, index) => (
                  <AnalysisInput
                    key={member.user.id}
                    member={member}
                    value={content.analyses[index]?.text ?? ''}
                    // 担当者が活動報告書を書いていなければ、総合評価をその人の評価にする
                    rating={member.report?.rating ?? (member.isWriter ? content.rating : null)}
                    error={fieldErrors[`analyses.${index}.text`]}
                    onChange={(text) => setAnalysis(member.user.id, text)}
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card title="評価">
            <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
              {field('overview', { rows: 5, required: true, max: SUMMARY_LIMITS.overview.max })}
              {field('impressions', { rows: 10, required: true, max: SUMMARY_LIMITS.impressions.max })}
              <RatingInput label={SUMMARY_FIELD_LABELS.rating} value={content.rating} onChange={(rating) => set('rating', rating)} error={fieldErrors.rating} />
              {field('notes', { rows: 3, placeholder: '任意', max: SUMMARY_LIMITS.notes.max })}
            </div>
          </Card>
        </div>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <SubmitCard status={status} dirty={dirty} canDelete={canDelete} pendingIntent={pendingIntent} problems={problems} resubmit={rejected} onSend={send} />
          {aside}
          <ReportInfo context={context} />
        </div>
      </div>
    </div>
  )
}
