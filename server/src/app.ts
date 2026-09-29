import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from './env'
import { authRoute } from './features/auth/routes'
import { blogRoute } from './features/blog/routes'
import { githubWebhookRoute } from './features/blog/webhook'
import { eventsRoute } from './features/events/routes'
import { membersRoute } from './features/members/routes'

const app = new Hono<AppEnv>()

app.use('/api/*', (c, next) => cors({ origin: c.env.FRONTEND_URL, credentials: true })(c, next))
// フォーム送信によるCSRFを防ぐ（JSONはCORSのプリフライトで守られる）
app.use('/api/*', (c, next) => csrf({ origin: c.env.FRONTEND_URL })(c, next))

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status)
  }
  console.error(error)
  return c.json({ error: 'サーバーでエラーが発生しました' }, 500)
})

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

const routes = app
  .route('/api/auth', authRoute)
  .route('/api/members', membersRoute)
  .route('/api/events', eventsRoute)
  .route('/api/blog', blogRoute)
  .route('/api/webhooks/github', githubWebhookRoute)

export default app

/** クライアント (hono/client) 用の型 */
export type AppType = typeof routes
export type { LoginError } from './features/auth/routes'
