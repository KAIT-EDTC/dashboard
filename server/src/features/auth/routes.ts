import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { gradeOf, parseNickname, parseStudentId, registrationSchema, splitName } from '@edtc/shared'
import { createDb } from '../../db'
import { userDivisions, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import {
  authorizeUrl,
  exchangeCode,
  fetchCurrentUser,
  fetchGuildMember,
  headDivisionsOf,
} from '../../lib/discord'
import { badRequest, conflict, unauthorized } from '../../lib/errors'
import { validate } from '../../lib/validator'
import {
  consumeOAuthState,
  endSession,
  issueOAuthState,
  readRegistration,
  startRegistration,
  startSession,
} from './session'

/** ログイン画面に表示するエラーの種類（クライアントの文言と対応） */
export type LoginError = 'invalid_state' | 'not_a_member' | 'auth_failed'

export const authRoute = new Hono<AppEnv>()
  .get('/login', (c) => {
    const state = issueOAuthState(c)
    return c.redirect(authorizeUrl(c.env, state))
  })

  .get('/callback', async (c) => {
    const loginPage = (error: LoginError) => c.redirect(`${c.env.FRONTEND_URL}/login?error=${error}`)

    const { code, state } = c.req.query()
    if (!consumeOAuthState(c, state) || !code) return loginPage('invalid_state')

    try {
      const accessToken = await exchangeCode(c.env, code)
      const [discordUser, member] = await Promise.all([
        fetchCurrentUser(accessToken),
        fetchGuildMember(accessToken, c.env.DISCORD_GUILD_ID),
      ])
      if (!member) return loginPage('not_a_member')

      const headOf = headDivisionsOf(c.env, member)
      const db = createDb(c.env)
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, discordUser.id)).get()

      if (existing) {
        // アイコン・ユーザー名・部長ロールはDiscord側を正とする（管理者はダッシュボードで管理する）
        await db
          .update(users)
          .set({ discordUsername: discordUser.username, discordAvatar: discordUser.avatar, headOf })
          .where(eq(users.id, discordUser.id))
        await startSession(c, discordUser.id)
        return c.redirect(c.env.FRONTEND_URL)
      }

      await startRegistration(c, {
        sub: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar,
        nick: member.nick,
        headOf,
      })
      return c.redirect(`${c.env.FRONTEND_URL}/register`)
    } catch (error) {
      console.error('Discord認証エラー:', error)
      return loginPage('auth_failed')
    }
  })

  .post('/logout', (c) => {
    endSession(c)
    return c.json({ ok: true })
  })

  // 登録フォームの初期表示用
  .get('/registration', async (c) => {
    const claims = await readRegistration(c)
    if (!claims) throw unauthorized('登録の有効期限が切れました。もう一度ログインしてください。')

    const parsed = claims.nick ? parseNickname(claims.nick) : null
    const student = parsed ? parseStudentId(parsed.studentId) : null
    return c.json({
      id: claims.sub,
      discordUsername: claims.username,
      discordAvatar: claims.avatar,
      nickname: claims.nick,
      student: student && { ...student, grade: gradeOf(student.enrollmentYear) },
      suggestedName: parsed ? splitName(parsed.name) : null,
    })
  })

  .post('/registration', validate('json', registrationSchema), async (c) => {
    const claims = await readRegistration(c)
    if (!claims) throw unauthorized('登録の有効期限が切れました。もう一度ログインしてください。')

    const parsed = claims.nick ? parseNickname(claims.nick) : null
    const student = parsed ? parseStudentId(parsed.studentId) : null
    if (!student) {
      throw badRequest('Discordのニックネームから学籍番号を読み取れませんでした。「学籍番号: 氏名」の形式に変更してから再度ログインしてください。')
    }

    const input = c.req.valid('json')
    const db = createDb(c.env)
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, claims.sub)).get()
    if (existing) throw conflict('すでに登録済みです')

    await db.batch([
      db.insert(users).values({
        id: claims.sub,
        discordUsername: claims.username,
        discordAvatar: claims.avatar,
        // 管理者が1人もいないとき（最初の登録者）だけ管理者にする
        role: sql`CASE WHEN EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN 'member' ELSE 'admin' END`,
        headOf: claims.headOf ?? [],
        lastName: input.lastName,
        firstName: input.firstName,
        lastNameKana: input.lastNameKana,
        firstNameKana: input.firstNameKana,
        studentId: student.studentId,
        enrollmentYear: student.enrollmentYear,
        faculty: student.faculty,
        department: student.department,
      }),
      db.insert(userDivisions).values(input.divisions.map((division) => ({ userId: claims.sub, division }))),
    ])

    await startSession(c, claims.sub)
    return c.json({ ok: true }, 201)
  })
