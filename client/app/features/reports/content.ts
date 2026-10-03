import { COMMENTABLE_FIELDS, type CommentableField, type ParticipantRole, type ReportDraftInput } from '@edtc/shared'
import type { ReportContext, ReportDetail, ReportReview } from './types'

export type ReportContent = Required<ReportDraftInput>

export function contentOf(report: ReportDetail): ReportContent {
  return {
    division: report.division,
    content: report.content,
    reflection: report.reflection,
    rating: report.rating,
    notes: report.notes,
    approverId: report.approverId,
  }
}

export function contextOf(report: ReportDetail, authorRole: ParticipantRole | null): ReportContext {
  return { event: report.event, author: report.author, authorRole, submittedAt: report.submittedAt }
}

/** サーバーは前後の空白を除いて保存するので、それを無視して比べる */
export function sameContent(a: ReportContent, b: ReportContent): boolean {
  const normalize = (c: ReportContent) => JSON.stringify(c, (_key, value) => (typeof value === 'string' ? value.trim() : value))
  return normalize(a) === normalize(b)
}

/** 修正依頼の番号順（項目の順・本文の位置の順） */
export const byPosition = (a: { field: CommentableField; start: number }, b: { field: CommentableField; start: number }) =>
  COMMENTABLE_FIELDS.indexOf(a.field) - COMMENTABLE_FIELDS.indexOf(b.field) || a.start - b.start

/** いちばん新しい差し戻し（本人が直すときに見る） */
export function latestRejection(reviews: ReportReview[]): ReportReview | undefined {
  return [...reviews].reverse().find((review) => review.decision === 'reject')
}
