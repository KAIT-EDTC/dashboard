import { reportDraftSchema, summaryDraftSchema } from '@edtc/shared'
import type { z } from 'zod'
import { api, ApiError, unwrap } from '~/lib/api'
import type { ReportContent, SummaryContent } from './content'

/** 自動保存。失敗したら画面に出すメッセージを返す（成功なら null） */
export type Autosave<T = ReportContent> = (content: T) => Promise<string | null>

async function attempt<S extends z.ZodType>(schema: S, content: unknown, save: (json: z.output<S>) => Promise<unknown>) {
  const parsed = schema.safeParse(content)
  if (!parsed.success) return parsed.error.issues[0]?.message ?? '入力内容を確認してください'
  try {
    await save(parsed.data)
    return null
  } catch (error) {
    if (error instanceof ApiError) return error.message
    if (error instanceof Response && error.status === 302) return 'ログインの期限が切れました。もう一度ログインしてください。'
    return '保存できませんでした。通信状況を確認してください。'
  }
}

/** 作成済みの報告書を上書き保存する */
export const saveDraft =
  (reportId: string): Autosave =>
  (content) =>
    attempt(reportDraftSchema, content, (json) => unwrap(api.reports[':id'].$put({ param: { id: reportId }, json })))

/** 作成ページ: 初めての保存で報告書を作る */
export const createDraft =
  (eventId: string): Autosave =>
  (content) =>
    attempt(reportDraftSchema, content, (json) => unwrap(api.reports.$post({ json: { ...json, eventId } })))

/** まとめ報告書を上書き保存する */
export const saveSummaryDraft =
  (reportId: string): Autosave<SummaryContent> =>
  (content) =>
    attempt(summaryDraftSchema, content, (json) => unwrap(api.reports.summaries[':id'].$put({ param: { id: reportId }, json })))

/** まとめ報告書の作成ページ: 初めての保存で作る */
export const createSummaryDraft =
  (eventId: string): Autosave<SummaryContent> =>
  (content) =>
    attempt(summaryDraftSchema, content, (json) => unwrap(api.reports.summaries.$post({ json: { ...json, eventId } })))
