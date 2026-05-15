import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'
import type { AppEnv } from '../types'

const app = new Hono<AppEnv>()

const authRoute = app
  // Discordの認可画面へリダイレクトするエンドポイント
  .get('/login', (c) => {
    const params = new URLSearchParams({
      client_id: c.env.DISCORD_CLIENT_ID,
      redirect_uri: c.env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
    })
    const discordAuthUrl = `https://discord.com/oauth2/authorize?${params.toString()}`
    return c.redirect(discordAuthUrl)
  })

  // Discordからのコールバックを処理するエンドポイント
  .get('/callback', async (c) => {
    const FRONTEND_URL = c.env.FRONTEND_URL || ''
    const code = c.req.query('code')
    if (!code) return c.text('認証コードがありません', 400)

    try {
      const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: c.env.DISCORD_CLIENT_ID,
          client_secret: c.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: c.env.DISCORD_REDIRECT_URI,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const tokenData = await tokenResponse.json() as { access_token: string }

      if (!tokenResponse.ok) {
        console.error('Token Exchange Error:', tokenData)
        return c.redirect(`${c.env.FRONTEND_URL}/login?error=token_exchange_failed`)
      }

      const accessToken = tokenData.access_token

      // ユーザーの所属サーバー一覧を取得
      const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const guilds = await guildsResponse.json() as Array<{ id: string }>

      if (!guildsResponse.ok) {
        console.error('Guilds Fetch Error:', guilds)
        return c.redirect(`${FRONTEND_URL}/login?error=guilds_fetch_failed`)
      }

      if (!Array.isArray(guilds)) {
        console.error('Guilds response is not an array:', guilds)
        return c.redirect(`${c.env.FRONTEND_URL}/login?error=invalid_response`)
      }

      // EDTCサーバーに所属しているか確認
      const isMember = guilds.some(guild => guild.id === c.env.GUILD_ID)

      if (!isMember) {
        // EDTCサーバーにいない場合はエラー
        return c.redirect(`${FRONTEND_URL}/login?error=not_a_member`)
      }

      // ユーザーの基本情報を取得
      const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userData = await userResponse.json() as { id: string, username: string }

      // セッション用のJWTを発行
      const payload = {
        sub: userData.id,
        name: userData.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      }
      const token = await sign(payload, c.env.JWT_SECRET, 'HS256')

      const isProd = c.env.NODE_ENV === 'production'
      // Cookieの属性設定
      setCookie(c, 'token', token, {
        path: '/',
        httpOnly: true,
        maxAge: 86400,
        sameSite: 'Lax',
        ...(isProd ? { domain: '.kaitedtc.com', secure: true } : {}),
      })


      return c.redirect(`${FRONTEND_URL}/dashboard`)
    } catch (error) {
      console.error('Discord認証エラー:', error)
      return c.redirect(`${FRONTEND_URL}/login?error=auth_failed`)
    }
  })

export default authRoute
