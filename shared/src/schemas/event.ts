import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { CATEGORY_TONES, ITEM_KINDS, PARTICIPANT_ROLES, RSVP_STATUSES, SHIFT_DAYS_MAX, SHIFT_HOUR_MAX, SHIFT_HOUR_MIN } from '../events'

/** 日本時間の YYYY-MM-DDTHH:mm */
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '日時の形式が正しくありません')

const shiftHour = z.number().int().min(SHIFT_HOUR_MIN).max(SHIFT_HOUR_MAX)

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
    /**
     * シフト（文化祭の店番など）。ありにすると、開始〜終了の時間帯を区切りで午前・午後に分けた枠を日ごとに作る。
     * 区切りが無ければ1日1枠。枠に入った人は、その中で出れない時間を1時間ごとに指定する
     */
    hasShifts: z.boolean().default(false),
    shiftStartHour: shiftHour.nullable().default(null),
    shiftEndHour: shiftHour.nullable().default(null),
    shiftSplitHour: shiftHour.nullable().default(null),
  })
  .refine((v) => !v.endsAt || v.endsAt >= v.startsAt, {
    path: ['endsAt'],
    message: '終了日時は開始日時より後にしてください',
  })
  .refine((v) => !v.hasShifts || v.shiftStartHour !== null, { path: ['shiftStartHour'], message: 'シフトの開始時刻を選んでください' })
  .refine((v) => !v.hasShifts || (v.shiftEndHour !== null && v.shiftStartHour !== null && v.shiftEndHour > v.shiftStartHour), {
    path: ['shiftEndHour'],
    message: 'シフトの終了時刻は開始時刻より後にしてください',
  })
  .refine((v) => !v.hasShifts || v.shiftSplitHour === null || (v.shiftSplitHour > (v.shiftStartHour ?? 0) && v.shiftSplitHour < (v.shiftEndHour ?? 0)), {
    path: ['shiftSplitHour'],
    message: '午前・午後の区切りは、開始と終了のあいだにしてください',
  })
  .refine((v) => !v.hasShifts || !v.endsAt || (Date.parse(v.endsAt.slice(0, 10)) - Date.parse(v.startsAt.slice(0, 10))) / 86_400_000 < SHIFT_DAYS_MAX, {
    path: ['endsAt'],
    message: `シフトを組めるのは${SHIFT_DAYS_MAX}日までです`,
  })
export type EventInput = z.input<typeof eventInputSchema>

export const rsvpSchema = z.object({
  status: z.enum(RSVP_STATUSES),
  comment: z.string().trim().max(200, 'コメントは200文字以内にしてください'),
})

export const participantUpdateSchema = z.object({
  attended: z.boolean().optional(),
  paid: z.boolean().optional(),
  role: z.enum(PARTICIPANT_ROLES).optional(),
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
        /** 講師を置くか。置かない種類のイベントは役割がなく、まとめ報告書の担当者を参加者から指名する */
        hasLecturer: z.boolean().default(true),
        /** 報告書を書くか。書かない種類のイベントは活動報告書・まとめ報告書の対象にならない */
        hasReport: z.boolean().default(true),
      }),
    )
    .min(1, '種類は1つ以上必要です')
    .max(30, '種類が多すぎます'),
})

/** 自分がシフトに入る／抜ける */
export const shiftJoinSchema = z.object({ joined: z.boolean() })

/** 入っているシフトの中で出れない時間（1時間ごとの枠の開始 `YYYY-MM-DDTHH:00`）を丸ごと置き換える */
export const availabilitySchema = z.object({
  unavailable: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/, '時間の形式が正しくありません'))
    .max(SHIFT_DAYS_MAX * 24),
})
