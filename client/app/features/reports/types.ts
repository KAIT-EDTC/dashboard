import type { InferResponseType } from 'hono/client'
import type { api } from '~/lib/api'

export type ReportTarget = InferResponseType<typeof api.reports.targets.$get, 200>['targets'][number]
export type MyReport = InferResponseType<typeof api.reports.mine.$get, 200>['reports'][number]
export type ReviewItem = InferResponseType<typeof api.reports.review.$get, 200>['reports'][number]
export type ReportDetailResponse = InferResponseType<(typeof api.reports)[':id']['$get'], 200>
export type ReportDetail = ReportDetailResponse['report']
