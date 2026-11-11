import { sum } from 'drizzle-orm'
import type { Db } from '../db'
import { eventAttachments } from '../db/schema'
import { badRequest } from './errors'

// R2の無料枠(10GB)を超えないよう、R2（FILES）に置くファイルの合計がこれを超えたらアップロードを止める
const STORAGE_MAX_BYTES = 8 * 1024 * 1024 * 1024

/** R2 に bytes を足しても上限に収まるか確かめる。大きさは D1 に記録したものから数える */
export async function assertStorageAvailable(db: Db, bytes: number) {
  const used = await db.select({ n: sum(eventAttachments.size) }).from(eventAttachments).get()
  if (Number(used?.n ?? 0) + bytes > STORAGE_MAX_BYTES) throw badRequest('ストレージの上限に達しているため、これ以上ファイルを追加できません')
}
