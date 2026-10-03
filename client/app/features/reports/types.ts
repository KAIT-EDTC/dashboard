import type { ParticipantRole } from '@edtc/shared'
import type { InferResponseType } from 'hono/client'
import type { api } from '~/lib/api'

type TargetsResponse = InferResponseType<typeof api.reports.targets.$get, 200>
export type ReportTarget = TargetsResponse['targets'][number]
export type SummaryTarget = TargetsResponse['summaries'][number]
export type MyReport = InferResponseType<typeof api.reports.mine.$get, 200>['reports'][number]
export type ReviewItem = InferResponseType<typeof api.reports.review.$get, 200>['reports'][number]
export type ReportDetailResponse = InferResponseType<(typeof api.reports)[':id']['$get'], 200>
export type ReportDetail = ReportDetailResponse['report']
export type ReportReview = ReportDetail['reviews'][number]
export type ReportComment = ReportReview['comments'][number]
export type ApproverCandidate = InferResponseType<typeof api.reports.approvers.$get, 200>['approvers'][number]
export type SubmissionStatusEvent = InferResponseType<typeof api.reports.status.$get, 200>['events'][number]
export type NewReportResponse = InferResponseType<typeof api.reports.new.$get, 200>
export type NewReportDraft = NonNullable<NewReportResponse['draft']>
/** まとめ報告書の参加者（評価・提出状況・自己分析の元になる事後報告） */
export type SummaryMember = ReportDetailResponse['members'][number]
export type NewSummaryResponse = InferResponseType<typeof api.reports.summaries.new.$get, 200>
export type NewSummaryDraft = NonNullable<NewSummaryResponse['draft']>
export type SummaryExport = InferResponseType<typeof api.reports.summaries.export.$get, 200>['summaries'][number]

/** 自動で入る欄（イベント・本人・役割）。作成前と作成後で共通。学籍番号は見られる人にだけ届く */
export type ReportContext = Pick<NewReportDraft, 'event'> & {
  author: Omit<NewReportDraft['author'], 'studentId'> & { studentId: string | null }
  /** 書いた人の役割（作成後に参加者から外れていれば null） */
  authorRole: ParticipantRole | null
  /** 活動報告書かまとめ報告書か（まとめ報告書は「担当者」と出す） */
  kind?: 'activity' | 'summary'
  submittedAt: string | null
}

/** 活動報告書が提出済み（承認待ち・承認済み）か */
export const hasSubmitted = (member: Pick<SummaryMember, 'report'>) => member.report?.status === 'submitted' || member.report?.status === 'approved'
