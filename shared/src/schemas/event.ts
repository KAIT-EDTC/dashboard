import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { ATTACHMENT_MAX_BYTES, EVENT_CATEGORIES, ITEM_KINDS, RSVP_STATUSES } from '../events'

/** 日本時間の YYYY-MM-DDTHH:mm */
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '日時の形式が正しくありません')

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, 'タイトルを入力してください').max(100, 'タイトルが長すぎます'),
    category: z.enum(EVENT_CATEGORIES),
    description: z.string().trim().max(5000, '説明が長すぎます'),
    location: z.string().trim().max(100, '場所が長すぎます'),
    startsAt: dateTime,
    endsAt: dateTime.nullable(),
    rsvpDeadline: dateTime.nullable(),
    capacity: z.number().int().min(1, '定員は1以上にしてください').max(1000).nullable(),
    fee: z.number().int().min(0, '参加費は0以上にしてください').max(1_000_000).nullable(),
    /** 対象の部署と個人。どちらも空なら全員向け */
    targetDivisions: z.array(z.enum(DIVISIONS)).max(DIVISIONS.length).default([]),
    targetUserIds: z.array(z.string().min(1)).max(100, '対象者は100人までにしてください').default([]),
  })
  .refine((v) => !v.endsAt || v.endsAt >= v.startsAt, {
    path: ['endsAt'],
    message: '終了日時は開始日時より後にしてください',
  })
export type EventInput = z.input<typeof eventInputSchema>

export const rsvpSchema = z.object({
  status: z.enum(RSVP_STATUSES),
  comment: z.string().trim().max(200, 'コメントは200文字以内にしてください'),
})

export const participantUpdateSchema = z.object({
  attended: z.boolean().optional(),
  paid: z.boolean().optional(),
})

const itemFields = {
  name: z.string().trim().min(1, '持ち物名を入力してください').max(60, '持ち物名が長すぎます'),
  kind: z.enum(ITEM_KINDS),
  quantity: z.number().int().min(1).max(999),
  note: z.string().trim().max(200, 'メモは200文字以内にしてください'),
}

export const itemInputSchema = z.object(itemFields)

export const itemUpdateSchema = z
  .object({
    ...itemFields,
    assigneeId: z.string().nullable(),
    prepared: z.boolean(),
  })
  .partial()

export const attachmentUploadSchema = z.object({
  file: z
    .file('ファイルを選択してください')
    .min(1, 'ファイルが空です')
    .max(ATTACHMENT_MAX_BYTES, `ファイルは${ATTACHMENT_MAX_BYTES / 1024 / 1024}MBまでです`),
})
