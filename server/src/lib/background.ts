import type { Context } from 'hono'

/** レスポンスを返した後も処理を続ける（通知など）。executionCtx が無い環境ではそのまま実行する */
export function runInBackground(c: Context, task: Promise<unknown>) {
  try {
    c.executionCtx.waitUntil(task)
  } catch {
    task.catch((error) => console.error(error))
  }
}
