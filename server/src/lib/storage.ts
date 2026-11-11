import { and, eq, inArray, lt, sum } from 'drizzle-orm'
import { createDb, type Db } from '../db'
import { eventAttachments, reportPhotos } from '../db/schema'
import type { Bindings } from '../env'
import { badRequest } from './errors'

/** まとめ報告書の写真の R2 での置き場所 */
export const photoKey = (reportId: string, fileName: string) => `reports/${reportId}/${fileName}`

// R2の無料枠(10GB)を超えないよう、R2（FILES）に置くファイルの合計がこれを超えたらアップロードを止める
const STORAGE_MAX_BYTES = 8 * 1024 * 1024 * 1024

/** R2 に bytes を足しても上限に収まるか確かめる。大きさは D1 に記録したもの（イベントの添付ファイルとまとめ報告書の写真）から数える */
export async function assertStorageAvailable(db: Db, bytes: number) {
  const [attachments, photos] = await Promise.all([
    db.select({ n: sum(eventAttachments.size) }).from(eventAttachments).get(),
    db.select({ n: sum(reportPhotos.size) }).from(reportPhotos).get(),
  ])
  if (Number(attachments?.n ?? 0) + Number(photos?.n ?? 0) + bytes > STORAGE_MAX_BYTES) throw badRequest('ストレージの上限に達しているため、これ以上ファイルを追加できません')
}

/** アップロードから2年経ったファイルは消す */
const RETENTION_DAYS = 730

/** 1回の実行で消す件数（D1 のバインド変数は1クエリ100個まで）。毎日動くので、溜まっていても数日で消える */
const EXPIRE_BATCH = 50

/** 期限切れのファイル（イベントの添付ファイルとまとめ報告書の写真）を R2 と D1 から消す（毎日の Cron で呼ぶ） */
export async function deleteExpiredFiles(env: Pick<Bindings, 'DB' | 'FILES'>) {
  const db = createDb(env)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const [attachments, photos] = await Promise.all([
    db
      .select({ id: eventAttachments.id, r2Key: eventAttachments.r2Key })
      .from(eventAttachments)
      .where(lt(eventAttachments.createdAt, cutoff))
      .limit(EXPIRE_BATCH),
    db
      .select({ reportId: reportPhotos.reportId, fileName: reportPhotos.fileName })
      .from(reportPhotos)
      .where(lt(reportPhotos.createdAt, cutoff))
      .limit(EXPIRE_BATCH),
  ])
  const keys = [...attachments.map((a) => a.r2Key), ...photos.map((p) => photoKey(p.reportId, p.fileName))]
  if (keys.length === 0) return
  // 先に R2 から消す。行の削除に失敗しても翌日やり直せる
  await env.FILES.delete(keys)
  if (attachments.length > 0) {
    await db.delete(eventAttachments).where(
      inArray(
        eventAttachments.id,
        attachments.map((a) => a.id),
      ),
    )
  }
  for (const p of photos) {
    await db.delete(reportPhotos).where(and(eq(reportPhotos.reportId, p.reportId), eq(reportPhotos.fileName, p.fileName)))
  }
}
