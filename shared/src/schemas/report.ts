import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { countChars, RATING_MAX, RATING_MIN, REPORT_FIELDS, REPORT_LIMITS } from '../reports'

const maxChars = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => countChars(v) <= max, `${label}は${max}文字以内にしてください`)

const rating = z.number().int().min(RATING_MIN).max(RATING_MAX)

/** 下書き保存。上限だけ確認し、未入力でもよい */
export const reportDraftSchema = z.object({
  division: z.enum(DIVISIONS).nullable(),
  content: maxChars('活動内容', REPORT_LIMITS.content.max),
  reflection: maxChars('事後報告', REPORT_LIMITS.reflection.max),
  rating: rating.nullable(),
  notes: maxChars('伝言事項・特記事項', REPORT_LIMITS.notes.max),
})
export type ReportDraftInput = z.input<typeof reportDraftSchema>

/** 提出。必須項目と事後報告の最低文字数も確認する */
export const reportSubmitSchema = reportDraftSchema.extend({
  division: z.enum(DIVISIONS, '所属部署を選んでください'),
  content: reportDraftSchema.shape.content.refine((v) => v.length > 0, '活動内容を入力してください'),
  reflection: reportDraftSchema.shape.reflection.refine(
    (v) => countChars(v) >= REPORT_LIMITS.reflection.min,
    `事後報告は${REPORT_LIMITS.reflection.min}文字以上書いてください`,
  ),
  rating: rating.nullable().refine((v) => v !== null, '活動評価を選んでください'),
})

export const reportReviewSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve') }),
  z.object({
    decision: z.literal('reject'),
    fields: z.array(z.enum(REPORT_FIELDS)).min(1, '直してほしい項目を選んでください'),
    comment: z
      .string()
      .trim()
      .min(1, 'コメントを入力してください')
      .refine((v) => countChars(v) <= REPORT_LIMITS.rejectionComment.max, `コメントは${REPORT_LIMITS.rejectionComment.max}文字以内にしてください`),
  }),
])
export type ReportReviewInput = z.input<typeof reportReviewSchema>
