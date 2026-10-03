import type { ReportDraftInput } from '@edtc/shared'
import type { ReportDetail } from './types'

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

/** サーバーは前後の空白を除いて保存するので、それを無視して比べる */
export function sameContent(a: ReportContent, b: ReportContent): boolean {
  const normalize = (c: ReportContent) => JSON.stringify(c, (_key, value) => (typeof value === 'string' ? value.trim() : value))
  return normalize(a) === normalize(b)
}
