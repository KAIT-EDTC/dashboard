import { z } from 'zod'
import { DIVISIONS } from '../divisions'
import { COMMENTABLE_FIELDS, countChars, HOSTINGS, RATING_MAX, RATING_MIN, REPORT_FIELD_LABELS, REPORT_LIMITS, SUMMARY_FIELD_LABELS, SUMMARY_LIMITS } from '../reports'

const maxText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => countChars(v) <= max, `${label}は${max}文字以内にしてください`)

/** 活動報告書の文章の項目 */
const maxChars = (field: 'content' | 'reflection' | 'notes') => maxText(REPORT_FIELD_LABELS[field], REPORT_LIMITS[field].max)

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

// --- まとめ報告書 -------------------------------------------------------------

/** 参加者1人分の自己分析 */
const analysis = z.object({
  userId: z.string().min(1),
  text: maxText(SUMMARY_FIELD_LABELS.analyses, SUMMARY_LIMITS.analysis.max),
})

/** 下書き保存。上限だけ確認し、未入力でもよい */
export const summaryDraftSchema = z.object({
  division: z.enum(DIVISIONS).nullable(),
  content: maxText(SUMMARY_FIELD_LABELS.content, SUMMARY_LIMITS.content.max).refine(
    (v) => v.split('\n').length <= SUMMARY_LIMITS.content.lines,
    `活動内容は${SUMMARY_LIMITS.content.lines}行以内にしてください`,
  ),
  hosting: z.enum(HOSTINGS).nullable(),
  analyses: z.array(analysis).max(200),
  overview: maxText(SUMMARY_FIELD_LABELS.overview, SUMMARY_LIMITS.overview.max),
  impressions: maxText(SUMMARY_FIELD_LABELS.impressions, SUMMARY_LIMITS.impressions.max),
  rating: rating.nullable(),
  notes: maxText(SUMMARY_FIELD_LABELS.notes, SUMMARY_LIMITS.notes.max),
  approverId: z.string().min(1).nullable(),
})
export type SummaryDraftInput = z.input<typeof summaryDraftSchema>

/** 提出。必須項目を確認する（参加者全員の自己分析と活動報告書の提出はサーバーで確認する） */
export const summarySubmitSchema = summaryDraftSchema.extend({
  division: z.enum(DIVISIONS, '所属部署を選んでください'),
  content: summaryDraftSchema.shape.content.refine((v) => v.length > 0, '活動内容を入力してください'),
  hosting: z.enum(HOSTINGS, '主催か参加かを選んでください'),
  overview: summaryDraftSchema.shape.overview.refine((v) => v.length > 0, '総評を入力してください'),
  impressions: summaryDraftSchema.shape.impressions.refine((v) => v.length > 0, '所感を入力してください'),
  rating: rating.nullable().refine((v) => v !== null, '総合評価を選んでください'),
})

export const summaryCreateSchema = summaryDraftSchema.extend({ eventId: z.string().min(1) })

/** まとめ報告書の担当者の指名。null で講師に戻す */
export const summaryWriterSchema = z.object({ userId: z.string().min(1).nullable() })

// --- 確認 -----------------------------------------------------------------------

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
