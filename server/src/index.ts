import app from './app'
import type { Bindings } from './env'
import { deleteExpiredFiles } from './lib/storage'

export default {
  fetch: app.fetch,
  scheduled: async (_controller: unknown, env: Bindings) => {
    await deleteExpiredFiles(env)
  },
}
