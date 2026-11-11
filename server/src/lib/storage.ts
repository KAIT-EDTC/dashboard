import { inArray, lt, sum } from 'drizzle-orm'
import { createDb, type Db } from '../db'
import { eventAttachments } from '../db/schema'
import type { Bindings } from '../env'
import { badRequest } from './errors'

// R2の無料枠(10GB)を超えないよう、R2（FILES）に置くファイルの合計がこれを超えたらアップロードを止める
const STORAGE_MAX_BYTES = 8 * 1024 * 1024 * 1024

/** R2 に bytes を足しても上限に収まるか確かめる。大きさは D1 に記録したものから数える */
export async function assertStorageAvailable(db: Db, bytes: number) {
  const used = await db.select({ n: sum(eventAttachments.size) }).from(eventAttachments).get()
  if (Number(used?.n ?? 0) + bytes > STORAGE_MAX_BYTES) throw badRequest('ストレージの上限に達しているため、これ以上ファイルを追加できません')
}

/** アップロードから2年経ったファイルは消す */
const RETENTION_DAYS = 730

/** 1回の実行で消す件数（D1 のバインド変数は1クエリ100個まで）。毎日動くので、溜まっていても数日で消える */
const EXPIRE_BATCH = 50

/** 期限切れのファイルを R2 と D1 から消す（毎日の Cron で呼ぶ） */
export async function deleteExpiredFiles(env: Pick<Bindings, 'DB' | 'FILES'>) {
  const db = createDb(env)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const attachments = await db
    .select({ id: eventAttachments.id, r2Key: eventAttachments.r2Key })
    .from(eventAttachments)
    .where(lt(eventAttachments.createdAt, cutoff))
    .limit(EXPIRE_BATCH)
  if (attachments.length === 0) return
  // 先に R2 から消す。行の削除に失敗しても翌日やり直せる
  await env.FILES.delete(attachments.map((a) => a.r2Key))
  await db.delete(eventAttachments).where(
    inArray(
      eventAttachments.id,
      attachments.map((a) => a.id),
    ),
  )
}
