import { hourLabel, type Division, type EventInput } from '@edtc/shared'
import { useState, type ReactNode } from 'react'
import { Form } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Checkbox, SelectField, TextareaField, TextField } from '~/components/ui/Field'
import { DivisionPicker } from '~/features/members/DivisionPicker'
import { MemberPicker } from '~/features/members/MemberPicker'
import type { MemberListItem } from '~/features/members/types'
import type { FormErrors } from '~/lib/form'

type EventFormProps = {
  defaultValue?: Partial<EventInput>
  /** 種類の選択肢（管理者が管理する） */
  categories: { id: string; label: string }[]
  /** 対象者の選択と人数の表示に使う */
  members: MemberListItem[]
  errors?: FormErrors
  submitting: boolean
  submitLabel: string
  /** 送信ボタンの左に並べる要素（キャンセルなど） */
  secondaryActions?: ReactNode
}

const HOURS = Array.from({ length: 25 }, (_, hour) => hour)

/** シフトの有無と時間帯。区切りがあれば日ごとに午前・午後の2枠、無ければ1枠を作る */
function ShiftSettings({ defaultValue, errors }: { defaultValue: Partial<EventInput>; errors: Record<string, string> }) {
  const [enabled, setEnabled] = useState(defaultValue.hasShifts ?? false)
  const [start, setStart] = useState(defaultValue.shiftStartHour ?? 9)
  const [end, setEnd] = useState(defaultValue.shiftEndHour ?? 17)
  const [split, setSplit] = useState<number | null>(defaultValue.hasShifts ? (defaultValue.shiftSplitHour ?? null) : 12)
  const grid = css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 'md' })
  const validSplit = split !== null && split > start && split < end

  return (
    <Card title="シフト">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        <Checkbox label="シフトを組む（文化祭の店番など）" name="hasShifts" value="true" checked={enabled} onChange={(e) => setEnabled(e.currentTarget.checked)} />
        {enabled && (
          <>
            <div className={grid}>
              <SelectField label="開始時刻" name="shiftStartHour" value={start} onChange={(e) => setStart(Number(e.currentTarget.value))} error={errors.shiftStartHour}>
                {HOURS.slice(0, 24).map((hour) => (
                  <option key={hour} value={hour}>
                    {hourLabel(hour)}
                  </option>
                ))}
              </SelectField>
              <SelectField label="終了時刻" name="shiftEndHour" value={end} onChange={(e) => setEnd(Number(e.currentTarget.value))} error={errors.shiftEndHour}>
                {HOURS.slice(1).map((hour) => (
                  <option key={hour} value={hour}>
                    {hourLabel(hour)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="午前・午後の区切り"
                name="shiftSplitHour"
                value={split ?? ''}
                onChange={(e) => setSplit(e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
                error={errors.shiftSplitHour}
              >
                <option value="">区切らない</option>
                {HOURS.filter((hour) => hour > start && hour < end).map((hour) => (
                  <option key={hour} value={hour}>
                    {hourLabel(hour)}
                  </option>
                ))}
              </SelectField>
            </div>
            <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
              {end > start &&
                (validSplit
                  ? `イベントの日ごとに「午前 ${hourLabel(start)}〜${hourLabel(split)}」「午後 ${hourLabel(split)}〜${hourLabel(end)}」の枠を作ります。`
                  : `イベントの日ごとに ${hourLabel(start)}〜${hourLabel(end)} の枠を1つ作ります。`)}
            </p>
          </>
        )}
      </div>
    </Card>
  )
}

type JoinSettingsProps = {
  defaultValue: Partial<EventInput>
  members: MemberListItem[]
  errors: Record<string, string>
  /** 対象を指定しているか。全員向けなら全員が参加できるので限定できない */
  targeted: boolean
  /** 対象者の人数（参加できる人数の表示に使う） */
  isTargetMember: (member: MemberListItem) => boolean
}

/** 参加できる人。限定すると、対象者とここで指定した部署・メンバーだけが出欠を回答できる */
function JoinSettings({ defaultValue, members, errors, targeted, isTargetMember }: JoinSettingsProps) {
  const [restricted, setRestricted] = useState(defaultValue.joinRestricted ?? false)
  const [joinDivisions, setJoinDivisions] = useState<Division[]>(defaultValue.joinDivisions ?? [])
  const [joinUserIds, setJoinUserIds] = useState<string[]>(defaultValue.joinUserIds ?? [])
  const active = restricted && targeted
  const joinCount = members.filter((m) => isTargetMember(m) || joinUserIds.includes(m.id) || m.divisions.some((d) => joinDivisions.includes(d))).length

  return (
    <Card
      title="参加できる人"
      action={
        <span className={css({ fontSize: 'sm', fontWeight: '600', color: active ? 'accent.fg' : 'fg.subtle' })}>
          {active ? `${joinCount}人` : '誰でも'}
        </span>
      }
    >
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        <Checkbox
          label="対象者と、指定したメンバーだけが参加できるようにする"
          name="joinRestricted"
          value="true"
          checked={active}
          disabled={!targeted}
          onChange={(e) => setRestricted(e.currentTarget.checked)}
        />
        {!targeted ? (
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>対象を指定すると、参加できる人を限定できます。</p>
        ) : (
          active && (
            <>
              <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
                対象者のほかに参加できる部署・メンバーを指定してください。指定しなければ対象者だけが参加できます。ここで指定した人には未回答の催促は届きません。主催者と管理者はいつでも出欠を変更できます。
              </p>
              <DivisionPicker
                name="joinDivisions"
                label="部署"
                hint="選んだ部署のメンバー全員が参加できる"
                required={false}
                defaultValue={joinDivisions}
                onChange={setJoinDivisions}
                error={errors.joinDivisions}
              />
              <MemberPicker members={members} value={joinUserIds} onChange={setJoinUserIds} label="個人で追加" />
              {joinUserIds.map((id) => (
                <input key={id} type="hidden" name="joinUserIds" value={id} />
              ))}
              {errors.joinUserIds && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{errors.joinUserIds}</p>}
            </>
          )
        )}
      </div>
    </Card>
  )
}

export function EventForm({ defaultValue = {}, categories, members, errors, submitting, submitLabel, secondaryActions }: EventFormProps) {
  const e = errors?.fieldErrors ?? {}
  const [targetDivisions, setTargetDivisions] = useState<Division[]>(defaultValue.targetDivisions ?? [])
  const [targetUserIds, setTargetUserIds] = useState<string[]>(defaultValue.targetUserIds ?? [])
  const isTargetMember = (m: MemberListItem) => targetUserIds.includes(m.id) || m.divisions.some((d) => targetDivisions.includes(d))
  const targetCount = members.filter(isTargetMember).length
  const targeted = targetDivisions.length > 0 || targetUserIds.length > 0
  const grid = css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: 'md' })
  return (
    <Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '760px' })}>
      {errors?.error && <Alert>{errors.error}</Alert>}
      <Card title="基本情報">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          <TextField label="タイトル" name="title" required defaultValue={defaultValue.title} placeholder="例: 第3回 遊行塾" error={e.title} />
          <div className={grid}>
            <SelectField label="種類" name="category" defaultValue={defaultValue.category ?? categories[0]?.id} error={e.category}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </SelectField>
            <TextField label="場所" name="location" defaultValue={defaultValue.location} placeholder="例: 12号館 3F" error={e.location} />
            <TextField label="開始日時" name="startsAt" type="datetime-local" required defaultValue={defaultValue.startsAt} error={e.startsAt} />
            <TextField label="終了日時" name="endsAt" type="datetime-local" defaultValue={defaultValue.endsAt ?? ''} error={e.endsAt} />
          </div>
          <TextareaField label="説明" name="description" rows={5} defaultValue={defaultValue.description} placeholder="内容・集合場所・服装など" error={e.description} />
        </div>
      </Card>

      <Card title="参加の受付">
        <div className={grid}>
          <TextField label="出欠の回答期限" name="rsvpDeadline" type="datetime-local" defaultValue={defaultValue.rsvpDeadline ?? ''} error={e.rsvpDeadline} hint="期限後は主催者のみ出欠を変更できます" />
          <TextField label="定員" name="capacity" type="number" min={1} defaultValue={defaultValue.capacity ?? ''} placeholder="なし" error={e.capacity} />
          <TextField label="参加費（円）" name="fee" type="number" min={0} step={1} defaultValue={defaultValue.fee ?? ''} placeholder="なし" error={e.fee} hint="設定すると参加者ごとに集金状況を記録できます" />
        </div>
      </Card>

      <ShiftSettings defaultValue={defaultValue} errors={e} />

      <Card
        title="対象"
        action={
          <span className={css({ fontSize: 'sm', fontWeight: '600', color: targeted ? 'accent.fg' : 'fg.subtle' })}>
            {targeted ? `対象 ${targetCount}人` : '指定なし（全員）'}
          </span>
        }
      >
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
            部署のミーティングなど、一部のメンバー向けのイベントは対象を指定してください。対象者だけに未回答の催促とDiscordのメンションが届きます（「参加できる人」を限定しなければ、対象外の人も参加を回答できます）。部署で指定すると、あとからその部署に入った人も対象になります。
          </p>
          <DivisionPicker
            name="targetDivisions"
            label="部署"
            hint="選んだ部署のメンバー全員が対象"
            required={false}
            defaultValue={defaultValue.targetDivisions}
            onChange={setTargetDivisions}
            error={e.targetDivisions}
          />
          <MemberPicker members={members} value={targetUserIds} onChange={setTargetUserIds} label="個人で追加" />
          {targetUserIds.map((id) => (
            <input key={id} type="hidden" name="targetUserIds" value={id} />
          ))}
          {e.targetUserIds && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{e.targetUserIds}</p>}
        </div>
      </Card>

      <JoinSettings defaultValue={defaultValue} members={members} errors={e} targeted={targeted} isTargetMember={isTargetMember} />

      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
        {secondaryActions}
        <Button type="submit" variant="primary" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </Form>
  )
}
