import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { verifyTempToken, createSession } from '../lib/session'
import { parseNickname, parseStudentId } from '../lib/student-id'

const VALID_DIVISIONS = ['営業部', '総務部', '広報部', '企画部', '人事部'] as const

const app = new Hono<AppEnv>()

const usersRoute = app
  // Register a new user (uses temp token from cookie, NOT auth middleware)
  .post('/register', async (c) => {
    const tempPayload = await verifyTempToken(c)
    if (!tempPayload) {
      return c.json({ error: '登録トークンが無効です。もう一度ログインしてください。' }, 401)
    }

    const body = await c.req.json<{
      lastName: string
      firstName: string
      lastNameKana: string
      firstNameKana: string
      division: string
    }>()

    // Validate required fields
    if (!body.lastName || !body.firstName || !body.lastNameKana || !body.firstNameKana || !body.division) {
      return c.json({ error: '全ての項目を入力してください' }, 400)
    }

    // Validate division
    // 兼部の場合このバリデーションはできない。
    if (!(VALID_DIVISIONS as readonly string[]).includes(body.division)) {
      return c.json({ error: '無効な部署です' }, 400)
    }

    // Parse student ID from nickname
    let studentId = ''
    let enrollmentYear = 0
    let faculty = '不明'
    let department = '不明'

    if (tempPayload.nick) {
      const parsed = parseNickname(tempPayload.nick)
      if (parsed) {
        const studentInfo = parseStudentId(parsed.studentId)
        if (studentInfo) {
          studentId = studentInfo.studentId
          enrollmentYear = studentInfo.enrollmentYear
          faculty = studentInfo.faculty
          department = studentInfo.department
        }
      }
    }

    // Insert user into DB
    const db = drizzle(c.env.DB)
    try {
      await db.insert(users).values({
        id: tempPayload.sub,
        discordUsername: tempPayload.name,
        discordAvatar: tempPayload.avatar,
        lastName: body.lastName,
        firstName: body.firstName,
        lastNameKana: body.lastNameKana,
        firstNameKana: body.firstNameKana,
        studentId,
        enrollmentYear,
        faculty,
        department,
        division: body.division,
      })
    } catch (error) {
      console.error('ユーザー登録エラー:', error)
      return c.json({ error: 'ユーザー登録に失敗しました' }, 500)
    }

    // Clear temp token and create session
    await createSession(c, { sub: tempPayload.sub, name: tempPayload.name })

    return c.json({ success: true })
  })

  // Get current user info (protected)
  .get('/me', authMiddleware, async (c) => {
    const authUser = c.get('user')
    const db = drizzle(c.env.DB)
    const user = await db.select().from(users).where(eq(users.id, authUser.id)).get()

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404)
    }

    return c.json(user)
  })

  // Get temp token info for registration form
  .get('/register/info', async (c) => {
    const tempPayload = await verifyTempToken(c)
    if (!tempPayload) {
      return c.json({ error: '登録トークンが無効です' }, 401)
    }

    let studentInfo = null
    if (tempPayload.nick) {
      const parsed = parseNickname(tempPayload.nick)
      if (parsed) {
        studentInfo = parseStudentId(parsed.studentId)
      }
    }

    return c.json({
      id: tempPayload.sub,
      discordUsername: tempPayload.name,
      discordAvatar: tempPayload.avatar,
      nickname: tempPayload.nick,
      studentInfo,
    })
  })

export default usersRoute
