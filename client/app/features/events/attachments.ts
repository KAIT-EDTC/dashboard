import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from '@edtc/shared'
import { ApiError, api, unwrap } from '~/lib/api'

export const ATTACHMENT_MAX_MB = ATTACHMENT_MAX_BYTES / 1024 / 1024

/** 追加しようとしたファイルのうち、サイズと個数の上限に収まるものだけを返す。弾いたものは理由を error にまとめる */
export function pickUploadable(files: File[], currentCount: number): { accepted: File[]; error?: string } {
  const problems: string[] = []
  const accepted: File[] = []
  for (const file of files) {
    if (file.size === 0) problems.push(`「${file.name}」は空のファイルです`)
    else if (file.size > ATTACHMENT_MAX_BYTES) problems.push(`「${file.name}」は${ATTACHMENT_MAX_MB}MBを超えています`)
    else if (currentCount + accepted.length >= ATTACHMENT_MAX_COUNT) problems.push(`「${file.name}」は個数の上限（${ATTACHMENT_MAX_COUNT}個）を超えるため追加できません`)
    else accepted.push(file)
  }
  return { accepted, error: problems.length > 0 ? problems.join('\n') : undefined }
}

/** ファイルを順にアップロードし、失敗したものを「ファイル名: 理由」で返す（1つ失敗しても残りは続ける） */
export async function uploadAttachments(eventId: string, files: File[]): Promise<string[]> {
  const failed: string[] = []
  for (const file of files) {
    try {
      await unwrap(api.events[':id'].attachments.$post({ param: { id: eventId }, form: { file } }))
    } catch (error) {
      // 401 のリダイレクトなど Response はそのまま投げる
      if (error instanceof Response) throw error
      failed.push(`${file.name}: ${error instanceof ApiError ? error.message : '通信に失敗しました'}`)
    }
  }
  return failed
}

/** フォームから送られたファイル（空の欄は除く） */
export function filesFrom(form: FormData, name: string): File[] {
  return form.getAll(name).filter((v): v is File => v instanceof File && v.size > 0)
}
