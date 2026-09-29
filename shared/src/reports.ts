/**
 * 活動報告書（旧: シン・活動報告書.xlsx）。
 * 活動日時・活動名・実施場所・役割はイベントから自動で入り、本人は内容と振り返りを書く
 */
export const REPORT_STATUSES = ['draft', 'submitted', 'approved', 'rejected'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: '下書き',
  submitted: '承認待ち',
  approved: '承認済み',
  rejected: '差し戻し',
}

/** 本人が書く項目。差し戻し時に「どこを直すか」として選ぶ */
export const REPORT_FIELDS = ['division', 'content', 'reflection', 'rating', 'notes'] as const
export type ReportField = (typeof REPORT_FIELDS)[number]
export const REPORT_FIELD_LABELS: Record<ReportField, string> = {
  division: '所属部署',
  content: '活動内容',
  reflection: '事後報告',
  rating: '活動評価',
  notes: '伝言事項・特記事項',
}

/** 文字数の制限（事後報告の300〜500字はExcel様式の入力規則を引き継ぐ） */
export const REPORT_LIMITS = {
  content: { max: 1000 },
  reflection: { min: 300, max: 500 },
  notes: { max: 500 },
  rejectionComment: { max: 500 },
} as const

/** 活動評価（1: 悪 〜 5: 良） */
export const RATING_MIN = 1
export const RATING_MAX = 5
export const RATING_LABELS = { min: '悪', max: '良' } as const

/** 文字数。サロゲートペア（絵文字など）も1文字と数え、前後の空白は数えない */
export function countChars(value: string): number {
  return [...value.trim()].length
}
