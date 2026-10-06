import type { Division, EventInput } from '@edtc/shared'
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

export function EventForm({ defaultValue = {}, categories, members, errors, submitting, submitLabel, secondaryActions }: EventFormProps) {
  const e = errors?.fieldErrors ?? {}
  const [targetDivisions, setTargetDivisions] = useState<Division[]>(defaultValue.targetDivisions ?? [])
  const [targetUserIds, setTargetUserIds] = useState<string[]>(defaultValue.targetUserIds ?? [])
  const targetCount = members.filter((m) => targetUserIds.includes(m.id) || m.divisions.some((d) => targetDivisions.includes(d))).length
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

      <Card title="講師">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
          <Checkbox label="講師を置く" name="hasLecturer" defaultChecked={defaultValue.hasLecturer ?? true} />
          <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>展示などの講師がいないイベントは外してください。まとめ報告書の担当者を参加者から指名します</p>
        </div>
      </Card>

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
            部署のミーティングなど、一部のメンバー向けのイベントは対象を指定してください。対象者だけに未回答の催促とDiscordのメンションが届きます（対象外の人も参加は回答できます）。部署で指定すると、あとからその部署に入った人も対象になります。
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

      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
        {secondaryActions}
        <Button type="submit" variant="primary" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </Form>
  )
}
