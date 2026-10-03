import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { COMMENTABLE_FIELDS, countChars, RATING_MAX, RATING_MIN, REPORT_FIELD_LABELS, REPORT_LIMITS, type CommentableField } from '../reports'

const maxChars = (field: CommentableField) =>
  z
    .string()
    .trim()
    .refine((v) => countChars(v) <= REPORT_LIMITS[field].max, `${REPORT_FIELD_LABELS[field]}は${REPORT_LIMITS[field].max}文字以内にしてください`)

const rating = z.number().int().min(RATING_MIN).max(RATING_MAX)

/** 下書き保存。上限だけ確認し、未入力でもよい */
export const reportDraftSchema = z.object({
  division: z.enum(DIVISIONS).nullable(),
  content: maxChars('content'),
  reflection: maxChars('reflection'),
  rating: rating.nullable(),
  notes: maxChars('notes'),
  /** 役職者が選ぶ承認者（部員は不要） */
  approverId: z.string().min(1).nullable(),
})
export type ReportDraftInput = z.input<typeof reportDraftSchema>

/** 提出。必須項目と事後報告の最低文字数も確認する */
export const reportSubmitSchema = reportDraftSchema.extend({
  division: z.enum(DIVISIONS, `${REPORT_FIELD_LABELS.division}を選んでください`),
  content: reportDraftSchema.shape.content.refine((v) => v.length > 0, `${REPORT_FIELD_LABELS.content}を入力してください`),
  reflection: reportDraftSchema.shape.reflection.refine((v) => v.length > 0, `${REPORT_FIELD_LABELS.reflection}を入力してください`),
  rating: rating.nullable().refine((v) => v !== null, `${REPORT_FIELD_LABELS.rating}を選んでください`),
})

/** 新しく作るとき（イベント選択後の作成ページから） */
export const reportCreateSchema = reportDraftSchema.extend({ eventId: z.string().min(1) })

const reviewComment = z
  .string()
  .trim()
  .refine((v) => countChars(v) <= REPORT_LIMITS.reviewComment.max, `コメントは${REPORT_LIMITS.reviewComment.max}文字以内にしてください`)

/**
 * 本文の範囲に付ける修正依頼。start / end は項目の文字列上の位置（UTF-16）。
 * suggestion は書き直し案（PRの suggested change のように、本人が1クリックで反映できる）。コメントか書き直し案のどちらかは必須
 */
export const inlineCommentSchema = z
  .object({
    field: z.enum(COMMENTABLE_FIELDS),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    quote: z.string().min(1).max(2000),
    body: reviewComment,
    suggestion: z.string().max(2000).nullable().default(null),
  })
  .refine((v) => v.end > v.start, { path: ['end'], message: '範囲が正しくありません' })
  .refine((v) => v.body.length > 0 || v.suggestion !== null, { path: ['body'], message: 'コメントか書き直し案を入力してください' })
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
