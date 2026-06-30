import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { exchangeCode, getUser, getUserGuilds, getGuildMember } from '../lib/discord'
import { createSession, createTempToken, clearSession } from '../lib/session'

const app = new Hono<AppEnv>()

const authRoute = app
  .get('/login', (c) => {
    const params = new URLSearchParams({
      client_id: c.env.DISCORD_CLIENT_ID,
      redirect_uri: c.env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
    })
    return c.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`)
  })

  .get('/callback', async (c) => {
    const FRONTEND_URL = c.env.FRONTEND_URL
    const code = c.req.query('code')
    if (!code) return c.redirect(`${FRONTEND_URL}/login?error=no_code`)

    try {
      // codeをtokenに変換
      const tokenData = await exchangeCode(code, c.env)
      const accessToken = tokenData.access_token

      // ユーザーがEDTCサーバーに入っているか確認
      const guilds = await getUserGuilds(accessToken)
      const isMember = guilds.some(g => g.id === c.env.GUILD_ID)
      if (!isMember) {
        return c.redirect(`${FRONTEND_URL}/login?error=not_a_member`)
      }

      // Discordのユーザー情報を取得
      const discordUser = await getUser(accessToken)

      // 既存ユーザーかどうかを確認
      const db = drizzle(c.env.DB)
      const existingUser = await db.select().from(users).where(eq(users.id, discordUser.id)).get()

      // ========== 既存ユーザー ==========
      // ダッシュボードへ
      if (existingUser) {
        await createSession(c, { sub: discordUser.id, name: discordUser.username })
        return c.redirect(`${FRONTEND_URL}/dashboard`)
      }

      // ========== 新規ユーザー ==========
      // サーバーニックネーム (学籍番号: 氏名) をEDTCサーバーから取得
      let nick: string | null = null
      try {
        const member = await getGuildMember(c.env.GUILD_ID, discordUser.id, c.env.DISCORD_BOT_TOKEN)
        nick = member.nick
      } catch {
        // ニックネームが取得できなかった場合
      }

      // 新規ユーザー登録用のトークンを作成
      await createTempToken(c, {
        sub: discordUser.id,
        name: discordUser.username,
        avatar: discordUser.avatar,
        nick,
      })
      console.log(`Created temp token for new user: ${discordUser.username} (${discordUser.id})`)
      // 登録フォームへリダイレクト
      return c.redirect(`${FRONTEND_URL}/register`)
    } catch (error) {
      console.error('Discord認証エラー:', error)
      return c.redirect(`${FRONTEND_URL}/login?error=auth_failed`)
    }
  })

  .get('/logout', (c) => {
    clearSession(c)
    return c.redirect(`${c.env.FRONTEND_URL}/login`)
  })

export default authRoute
