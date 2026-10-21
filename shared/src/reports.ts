import type { Division } from './divisions'

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
  rejected: '修正依頼',
}

/**
 * 報告書の種類。
 * activity: 参加者それぞれが書く活動報告書
 * summary: イベントごとに担当者1人が書くまとめ報告書（旧: シン・まとめ報告書.xlsx）。全員の活動報告書が提出されたら提出できる
 */
export const REPORT_KINDS = ['activity', 'summary'] as const
export type ReportKind = (typeof REPORT_KINDS)[number]
export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  activity: '活動報告書',
  summary: 'まとめ報告書',
}
/** 本人が書き直せる状態（下書き・修正依頼） */
export const EDITABLE_REPORT_STATUSES: readonly ReportStatus[] = ['draft', 'rejected']
export const isEditableStatus = (status: ReportStatus) => EDITABLE_REPORT_STATUSES.includes(status)

/** 本人が書く項目 */
export const REPORT_FIELDS = ['division', 'content', 'reflection', 'rating', 'notes'] as const
export type ReportField = (typeof REPORT_FIELDS)[number]
export const REPORT_FIELD_LABELS: Record<ReportField, string> = {
  division: '所属部署',
  content: '活動内容',
  reflection: '事後報告',
  rating: '活動評価',
  notes: '伝言事項・特記事項',
}

/** まとめ報告書で担当者が書く項目 */
export const SUMMARY_FIELDS = ['division', 'content', 'hosting', 'analyses', 'overview', 'impressions', 'rating', 'notes'] as const
export type SummaryField = (typeof SUMMARY_FIELDS)[number]
export const SUMMARY_FIELD_LABELS: Record<SummaryField, string> = {
  division: '所属部署',
  content: '活動内容',
  hosting: '主催・参加',
  analyses: '自己分析',
  overview: '総評',
  impressions: '所感',
  rating: '総合評価',
  notes: '特記事項',
}

/** EDTCが主催した活動か、ほかの団体の活動に参加したか */
export const HOSTINGS = ['host', 'guest'] as const
export type Hosting = (typeof HOSTINGS)[number]
export const HOSTING_LABELS: Record<Hosting, string> = { host: '主催', guest: '参加' }

/** 範囲を選んでコメントできる文章の項目（番号はこの順に振る） */
export const COMMENTABLE_FIELDS = ['content', 'reflection', 'overview', 'impressions', 'notes'] as const
export type CommentableField = (typeof COMMENTABLE_FIELDS)[number]
/** 種類ごとの、範囲コメントできる項目 */
export const COMMENTABLE_FIELDS_OF: Record<ReportKind, readonly CommentableField[]> = {
  activity: ['content', 'reflection', 'notes'],
  summary: ['content', 'overview', 'impressions', 'notes'],
}

/** 文字数の上限 */
export const REPORT_LIMITS = {
  content: { max: 1000 },
  reflection: { max: 500 },
  notes: { max: 500 },
  reviewComment: { max: 500 },
  /** 1回の差し戻しで付けられる範囲コメントの数 */
  inlineComments: { max: 30 },
} as const

/** まとめ報告書の文字数の上限（Excel様式の欄の大きさに合わせる） */
export const SUMMARY_LIMITS = {
  /** 活動内容は様式の「・」の行の数まで */
  content: { max: 300, lines: 3 },
  /** 1人分の自己分析 */
  analysis: { max: 200 },
  overview: { max: 314 },
  impressions: { max: 611 },
  notes: { max: 300 },
} as const

/** 活動評価（1: 悪 〜 5: 良） */
export const RATING_MIN = 1
export const RATING_MAX = 5
export const RATING_LABELS = { min: '悪', max: '良' } as const

/** 文字数。サロゲートペア（絵文字など）も1文字と数え、前後の空白は数えない */
export function countChars(value: string): number {
  return [...value.trim()].length
}

// ---------------------------------------------------------------------------
// 承認の流れ
// ---------------------------------------------------------------------------

/** 部署をまたぐ役職（Discordロールで判定） */
export const OFFICERS = ['representative', 'general_manager'] as const
export type Officer = (typeof OFFICERS)[number]
export const OFFICER_LABELS: Record<Officer, string> = {
  representative: '代表',
  general_manager: '本部長',
}

/** 役職者（部署長・本部長・代表のどれか） */
export type Position = { officer: Officer | null; headOf: Division[] }
export const isLeader = (user: Position) => !!user.officer || user.headOf.length > 0

/** 部署長の表示（営業部長 など） */
export const divisionHeadLabel = (division: Division) => `${division}長`

/** 役職の表示（代表・本部長・営業部長 など） */
export function positionLabels(user: Position): string[] {
  return [...(user.officer ? [OFFICER_LABELS[user.officer]] : []), ...user.headOf.map(divisionHeadLabel)]
}

/**
 * 承認の段階。
 * division_head: 報告書で選んだ所属部署の部署長（部員の報告書）
 * designated: 提出者が選んだ承認者1人（役職者の報告書。自分以外の部署長・本部長・代表から選ぶ）
 */
export const APPROVAL_STEPS = ['division_head', 'designated'] as const
export type ApprovalStep = (typeof APPROVAL_STEPS)[number]
export const APPROVAL_STEP_LABELS: Record<ApprovalStep, string> = {
  division_head: '部署長',
  designated: '承認者',
}

/** 提出者の立場から承認の流れを決める。部員は部署長、役職者は自分で選んだ承認者 */
export function approvalStepsFor(author: Position): ApprovalStep[] {
  return isLeader(author) ? ['designated'] : ['division_head']
}

/** その段階を承認できるか（自分の報告書かどうかは呼び出し側で確認する） */
export function canApproveStep(
  reviewer: Position & { id: string },
  step: ApprovalStep,
  report: { division: Division | null; approverId: string | null },
): boolean {
  if (step === 'designated') return !!report.approverId && report.approverId === reviewer.id
  return !!report.division && reviewer.headOf.includes(report.division)
}
