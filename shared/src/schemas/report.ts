import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { COMMENTABLE_FIELDS, countChars, RATING_MAX, RATING_MIN, REPORT_LIMITS } from '../reports'

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
  /** 役職者が選ぶ承認者（部員は不要） */
  approverId: z.string().min(1).nullable(),
})
export type ReportDraftInput = z.input<typeof reportDraftSchema>

/** 提出。必須項目と事後報告の最低文字数も確認する */
export const reportSubmitSchema = reportDraftSchema.extend({
  division: z.enum(DIVISIONS, '所属部署を選んでください'),
  content: reportDraftSchema.shape.content.refine((v) => v.length > 0, '活動内容を入力してください'),
  reflection: reportDraftSchema.shape.reflection.refine((v) => v.length > 0, '事後報告を入力してください'),
  rating: rating.nullable().refine((v) => v !== null, '活動評価を選んでください'),
})

/** 新しく作るとき（イベント選択後の作成ページから） */
export const reportCreateSchema = reportDraftSchema.extend({ eventId: z.string().min(1) })

const reviewComment = z
  .string()
  .trim()
  .refine((v) => countChars(v) <= REPORT_LIMITS.reviewComment.max, `コメントは${REPORT_LIMITS.reviewComment.max}文字以内にしてください`)

/** 本文の範囲に付けるコメント。start / end は項目の文字列上の位置（UTF-16） */
export const inlineCommentSchema = z
  .object({
    field: z.enum(COMMENTABLE_FIELDS),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    quote: z.string().min(1).max(2000),
    body: reviewComment.refine((v) => v.length > 0, 'コメントを入力してください'),
  })
  .refine((v) => v.end > v.start, { path: ['end'], message: '範囲が正しくありません' })
export type InlineCommentInput = z.input<typeof inlineCommentSchema>

export const reportReviewSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve'), comment: reviewComment.default('') }),
  z
    .object({
      decision: z.literal('reject'),
      comment: reviewComment,
      comments: z.array(inlineCommentSchema).max(REPORT_LIMITS.inlineComments.max, '範囲コメントが多すぎます'),
    })
    .refine((v) => v.comment.length > 0 || v.comments.length > 0, {
      path: ['comment'],
      message: '差し戻すときは、全体へのコメントか範囲コメントを1つ以上付けてください',
    }),
])
export type ReportReviewInput = z.input<typeof reportReviewSchema>
