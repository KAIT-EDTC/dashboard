import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { CATEGORY_TONES, ITEM_KINDS, RSVP_STATUSES } from '../events'

/** 日本時間の YYYY-MM-DDTHH:mm */
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '日時の形式が正しくありません')

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, 'タイトルを入力してください').max(100, 'タイトルが長すぎます'),
    /** イベントの種類のID。存在するかはサーバーが確かめる */
    category: z.string().min(1, '種類を選択してください'),
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

export const itemInputSchema = z.object({ ...itemFields, assigneeId: z.string().nullable().optional() })

export const itemUpdateSchema = z
  .object({
    ...itemFields,
    assigneeId: z.string().nullable(),
    prepared: z.boolean(),
  })
  .partial()

export const CATEGORY_LABEL_MAX = 20

/** イベントの種類の一括保存（管理者）。上から順に並び、id のないものは新規追加、載っていない既存の種類は削除 */
export const eventCategoriesSaveSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1, '種類の名前を入力してください').max(CATEGORY_LABEL_MAX, '種類の名前が長すぎます'),
        tone: z.enum(CATEGORY_TONES),
      }),
    )
    .min(1, '種類は1つ以上必要です')
    .max(30, '種類が多すぎます'),
})
