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
  rejected: '差し戻し',
}

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

/** 範囲を選んでコメントできる文章の項目 */
export const COMMENTABLE_FIELDS = ['content', 'reflection', 'notes'] as const
export type CommentableField = (typeof COMMENTABLE_FIELDS)[number]

/** 文字数の上限 */
export const REPORT_LIMITS = {
  content: { max: 1000 },
  reflection: { max: 500 },
  notes: { max: 500 },
  reviewComment: { max: 500 },
  /** 1回の差し戻しで付けられる範囲コメントの数 */
  inlineComments: { max: 30 },
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

/** 役職の表示（代表・本部長・営業部長 など） */
export function positionLabels(user: Position): string[] {
  return [...(user.officer ? [OFFICER_LABELS[user.officer]] : []), ...user.headOf.map((division) => `${division}長`)]
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
