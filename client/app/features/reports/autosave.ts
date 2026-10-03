import { reportDraftSchema } from '@edtc/shared'
import { api, ApiError, unwrap } from '~/lib/api'
import type { ReportContent } from './content'

/** 自動保存。失敗したら画面に出すメッセージを返す（成功なら null） */
export type Autosave = (content: ReportContent) => Promise<string | null>

async function attempt(content: ReportContent, save: (json: ReturnType<typeof reportDraftSchema.parse>) => Promise<unknown>) {
  const parsed = reportDraftSchema.safeParse(content)
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
    attempt(content, (json) => unwrap(api.reports[':id'].$put({ param: { id: reportId }, json })))

/** 作成ページ: 初めての保存で報告書を作る */
export const createDraft =
  (eventId: string): Autosave =>
  (content) =>
    attempt(content, (json) => unwrap(api.reports.$post({ json: { ...json, eventId } })))
