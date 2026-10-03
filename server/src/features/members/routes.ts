import { and, asc, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { gradeOf, profileSchema, type Division } from '@edtc/shared'
import { createDb, type Db } from '../../db'
import { blogPosts, userDivisions, users } from '../../db/schema'
import type { AppEnv } from '../../env'
import { notFound } from '../../lib/errors'
import { validate } from '../../lib/validator'
import { requireAuth } from '../../middleware/auth'

type UserRow = typeof users.$inferSelect

function withDerived<T extends Pick<UserRow, 'enrollmentYear'>>(user: T, divisions: { division: Division }[]) {
  return { ...user, divisions: divisions.map((d) => d.division), grade: gradeOf(user.enrollmentYear) }
}

async function findMember(db: Db, id: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { divisions: { columns: { division: true } } },
  })
  if (!user) throw notFound('メンバーが見つかりません')
  const { divisions, ...rest } = user
  return withDerived(rest, divisions)
}

export const membersRoute = new Hono<AppEnv>()
  .use(requireAuth)

  // メンバー名簿（交流ページ）
  .get('/', async (c) => {
    const rows = await createDb(c.env).query.users.findMany({
      columns: {
        id: true,
        discordUsername: true,
        discordAvatar: true,
        role: true,
        headOf: true,
        officer: true,
        lastName: true,
        firstName: true,
        lastNameKana: true,
        firstNameKana: true,
        nickname: true,
        headline: true,
        interests: true,
        enrollmentYear: true,
        faculty: true,
        department: true,
        createdAt: true,
      },
      with: { divisions: { columns: { division: true } } },
      orderBy: [asc(users.enrollmentYear), asc(users.lastNameKana), asc(users.firstNameKana)],
    })
    return c.json({ members: rows.map(({ divisions, ...user }) => withDerived(user, divisions)) })
  })

  // ログイン中のユーザー
  .get('/me', async (c) => {
    return c.json(await findMember(createDb(c.env), c.get('session').userId))
  })

  .put('/me', validate('json', profileSchema), async (c) => {
    const { userId } = c.get('session')
    const { divisions, ...profile } = c.req.valid('json')
    const db = createDb(c.env)
    await db.batch([
      db.update(users).set(profile).where(eq(users.id, userId)),
      db.delete(userDivisions).where(eq(userDivisions.userId, userId)),
      db.insert(userDivisions).values(divisions.map((division) => ({ userId, division }))),
    ])
    return c.json(await findMember(db, userId))
  })

  .get('/:id', async (c) => {
    const db = createDb(c.env)
    // 学籍番号は本人以外には見せない
    const { studentId: _studentId, ...member } = await findMember(db, c.req.param('id'))
    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        articleId: blogPosts.articleId,
        eventDate: blogPosts.eventDate,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .where(and(eq(blogPosts.authorId, member.id), eq(blogPosts.status, 'published')))
      .orderBy(desc(blogPosts.eventDate))
      .limit(10)
    return c.json({ member, posts })
  })
