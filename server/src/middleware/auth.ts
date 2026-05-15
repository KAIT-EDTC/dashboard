import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { AppEnv, AuthUser } from '../types'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  // クッキーからトークンを取得
  const token = getCookie(c, 'token')

  if (!token) {
    return c.json({ error: '認証失敗' }, 401)
  }

  try {
    // jwtを検証する
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as { sub: string; name: string }

    // Contextにユーザー情報をセット
    const user: AuthUser = {
      id: payload.sub,
      username: payload.name,
    }
    c.set('user', user)

    await next()
  } catch (error) {
    return c.json({ error: '認証失敗: 不正なトークンです。' })
  }
})
