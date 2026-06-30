import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Discord user ID
  discordUsername: text('discord_username').notNull(),
  discordAvatar: text('discord_avatar'),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  lastNameKana: text('last_name_kana').notNull(),
  firstNameKana: text('first_name_kana').notNull(),
  studentId: text('student_id').notNull(),
  enrollmentYear: integer('enrollment_year').notNull(),
  faculty: text('faculty').notNull(),
  department: text('department').notNull(),
  division: text('division').notNull(), // 部署 (営業部|総務部|広報部|企画部|人事部)
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})

export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(), // UUID
  authorId: text('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  eventName: text('event_name').notNull(),
  eventDate: text('event_date').notNull(), // mm-dd format
  status: text('status', { enum: ['draft', 'published'] }).default('draft').notNull(),
  githubPrUrl: text('github_pr_url'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})

// Inferred types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type BlogPost = typeof blogPosts.$inferSelect
export type NewBlogPost = typeof blogPosts.$inferInsert
