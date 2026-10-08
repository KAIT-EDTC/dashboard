import { asc, eq, like } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../../db'
import { users } from '../../db/schema'
import type { AppEnv, Bindings } from '../../env'
import { notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { startSession } from './session'

/** シードのダミーユーザー（seed/seed.sql）のIDの頭 */
const SEED_PREFIX = 'seed-'
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/**
 * 開発用ログインを使えるか。.dev.vars に DEV_LOGIN=true があり、画面もAPIもローカルで動いているときだけ。
 * 本番は DEV_LOGIN を設定しないうえ FRONTEND_URL が https なので、どちらの条件でも弾かれる
 */
function devLoginEnabled(env: Bindings, requestUrl: string): boolean {
  if (env.DEV_LOGIN !== 'true') return false
  const frontend = new URL(env.FRONTEND_URL)
  return frontend.protocol === 'http:' && LOCAL_HOSTS.includes(frontend.hostname) && LOCAL_HOSTS.includes(new URL(requestUrl).hostname)
}

/** Discordを通さず、シードのダミーユーザーとしてログインする（ローカル開発専用） */
export const devLoginRoute = new Hono<AppEnv>()
  .use((c, next) => {
    // 無効なときはエンドポイントがないのと同じに見せる
    if (!devLoginEnabled(c.env, c.req.url)) throw notFound()
    return next()
  })

  .get('/users', async (c) => {
    const rows = await createDb(c.env).query.users.findMany({
      where: like(users.id, `${SEED_PREFIX}%`),
      columns: { id: true, discordUsername: true, discordAvatar: true, lastName: true, firstName: true, role: true, headOf: true, officer: true },
      with: { divisions: { columns: { division: true } } },
      orderBy: asc(users.id),
    })
    return c.json({
      users: rows.map(({ divisions, ...user }) => ({ ...user, divisions: divisions.map((d) => d.division) })),
    })
  })

  .post('/login', validate('json', z.object({ userId: z.string().startsWith(SEED_PREFIX) })), async (c) => {
    const { userId } = c.req.valid('json')
    const user = await createDb(c.env).query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } })
    if (!user) throw notFound('ユーザーが見つかりません。npm run db:seed を実行してください')
    await startSession(c, user.id)
    return c.json({ ok: true })
  })
