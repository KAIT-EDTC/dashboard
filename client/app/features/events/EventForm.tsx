import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type EventInput } from '@edtc/shared'
import type { ReactNode } from 'react'
import { Form } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { SelectField, TextareaField, TextField } from '~/components/ui/Field'
import type { FormErrors } from '~/lib/form'

type EventFormProps = {
  defaultValue?: Partial<EventInput>
  errors?: FormErrors
  submitting: boolean
  submitLabel: string
  /** 送信ボタンの左に並べる要素（キャンセルなど） */
  secondaryActions?: ReactNode
}

export function EventForm({ defaultValue = {}, errors, submitting, submitLabel, secondaryActions }: EventFormProps) {
  const e = errors?.fieldErrors ?? {}
  const grid = css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: 'md' })
  return (
    <Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '760px' })}>
      {errors?.error && <Alert>{errors.error}</Alert>}
      <Card title="基本情報">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          <TextField label="タイトル" name="title" required defaultValue={defaultValue.title} placeholder="例: 第3回 遊行塾" error={e.title} />
          <div className={grid}>
            <SelectField label="種類" name="category" defaultValue={defaultValue.category ?? 'activity'} error={e.category}>
              {EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EVENT_CATEGORY_LABELS[category]}
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

      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
        {secondaryActions}
        <Button type="submit" variant="primary" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </Form>
  )
}
