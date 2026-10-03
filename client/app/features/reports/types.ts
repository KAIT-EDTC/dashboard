import type { ParticipantRole } from '@edtc/shared'
import type { InferResponseType } from 'hono/client'
import type { api } from '~/lib/api'

export type ReportTarget = InferResponseType<typeof api.reports.targets.$get, 200>['targets'][number]
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

/** 自動で入る欄（イベント・本人・役割）。作成前と作成後で共通。学籍番号は見られる人にだけ届く */
export type ReportContext = Pick<NewReportDraft, 'event'> & {
  author: Omit<NewReportDraft['author'], 'studentId'> & { studentId: string | null }
  /** 書いた人の役割（作成後に参加者から外れていれば null） */
  authorRole: ParticipantRole | null
  submittedAt: string | null
}
