import type { ReportDraftInput, SummaryDraftInput } from '@edtc/shared'
import type { ReportDetail } from './types'

export type ReportContent = Required<ReportDraftInput>
export type SummaryContent = Required<SummaryDraftInput>

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

export function summaryContentOf(report: ReportDetail): SummaryContent {
  return {
    division: report.division,
    content: report.content,
    hosting: report.hosting,
    analyses: report.analyses,
    overview: report.overview,
    impressions: report.impressions,
    rating: report.rating,
    notes: report.notes,
    approverId: report.approverId,
  }
}

/** サーバーは前後の空白を除いて保存するので、それを無視して比べる */
export function sameContent<T>(a: T, b: T): boolean {
  const normalize = (c: T) => JSON.stringify(c, (_key, value) => (typeof value === 'string' ? value.trim() : value))
  return normalize(a) === normalize(b)
}
