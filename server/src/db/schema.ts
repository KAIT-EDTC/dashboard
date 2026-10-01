import { relations, sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import {
  BLOG_STATUSES,
  EVENT_CATEGORIES,
  ITEM_KINDS,
  RSVP_STATUSES,
  type BlogPostContent,
  type Division,
  type ProfileLinks,
} from '@edtc/shared'

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

const timestamps = {
  createdAt: text('created_at').notNull().default(nowIso),
  updatedAt: text('updated_at')
    .notNull()
    .default(nowIso)
    .$onUpdate(() => new Date().toISOString()),
}

// ---------------------------------------------------------------------------
// メンバー
// ---------------------------------------------------------------------------

export const users = sqliteTable('users', {
  /** Discord user ID */
  id: text('id').primaryKey(),
  discordUsername: text('discord_username').notNull(),
  discordAvatar: text('discord_avatar'),
  /** ログインのたびにDiscordロールから再計算される */
  role: text('role', { enum: ['member', 'admin'] }).notNull().default('member'),

  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  lastNameKana: text('last_name_kana').notNull(),
  firstNameKana: text('first_name_kana').notNull(),
  studentId: text('student_id').notNull(),
  enrollmentYear: integer('enrollment_year').notNull(),
  faculty: text('faculty').notNull(),
  department: text('department').notNull(),

  // 自己紹介（交流ページで公開される）
  nickname: text('nickname').notNull().default(''),
  headline: text('headline').notNull().default(''),
  bio: text('bio').notNull().default(''),
  interests: text('interests', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  links: text('links', { mode: 'json' }).$type<ProfileLinks>().notNull().default(sql`'{}'`),

  ...timestamps,
})

/** 兼部に対応するため部署は別テーブル */
export const userDivisions = sqliteTable(
  'user_divisions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    division: text('division').$type<Division>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.division] })],
)

// ---------------------------------------------------------------------------
// ブログ
// ---------------------------------------------------------------------------

export const blogPosts = sqliteTable(
  'blog_posts',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),

    // 記事の中身（Markdownとして EDTCHP に PR される）
    title: text('title').notNull().default(''),
    eventDate: text('event_date').notNull().default(''),
    /** 旧ルールの記事ID末尾（廃止。新しい記事では使わない） */
    slug: text('slug').notNull().default(''),
    /** シリーズID（BLOG_SERIES）。記事IDの末尾になる */
    series: text('series').notNull().default(''),
    description: text('description').notNull().default(''),
    authorName: text('author_name').notNull().default(''),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    thumbnail: text('thumbnail'),
    body: text('body').notNull().default(''),

    // 公開フロー
    status: text('status', { enum: BLOG_STATUSES }).notNull().default('draft'),
    /** 提出時点の内容。PRのブランチは常にこのスナップショットから作り直す */
    submittedContent: text('submitted_content', { mode: 'json' }).$type<BlogPostContent>(),
    /** 提出時点の記事ID（YY-MM-DD-シリーズ[-連番]）。一度公開したら変更できない */
    articleId: text('article_id'),
    branch: text('branch'),
    prNumber: integer('pr_number'),
    prUrl: text('pr_url'),
    submittedAt: text('submitted_at'),
    publishedAt: text('published_at'),

    ...timestamps,
  },
  (t) => [index('blog_posts_author_idx').on(t.authorId), index('blog_posts_pr_idx').on(t.prNumber)],
)

/** 記事に付けられるタグ。管理者がダッシュボードで管理し、記事には表示名で保存する */
export const blogTags = sqliteTable('blog_tags', {
  id: text('id').primaryKey(),
  label: text('label').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamps.createdAt,
})

/**
 * 記事の画像（WebP）。本文からは ./<fileName> で参照し、PRでは記事フォルダに同じ名前で置かれる。
 * D1の行サイズ上限(2MB)に収まるようクライアント側で縮小してから base64 で保存する。
 */
export const blogImages = sqliteTable(
  'blog_images',
  {
    postId: text('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    data: text('data').notNull(),
    size: integer('size').notNull(),
    /** GitHubにアップロード済みのblob SHA（再提出時の再アップロードを省く） */
    gitBlobSha: text('git_blob_sha'),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.postId, t.fileName] })],
)

// ---------------------------------------------------------------------------
// イベント
// ---------------------------------------------------------------------------

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    category: text('category', { enum: EVENT_CATEGORIES }).notNull(),
    description: text('description').notNull().default(''),
    location: text('location').notNull().default(''),
    /** 日本時間 YYYY-MM-DDTHH:mm */
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at'),
    rsvpDeadline: text('rsvp_deadline'),
    capacity: integer('capacity'),
    /** 参加費（円） */
    fee: integer('fee'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [index('events_starts_at_idx').on(t.startsAt)],
)

export const eventParticipants = sqliteTable(
  'event_participants',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: RSVP_STATUSES }).notNull(),
    comment: text('comment').notNull().default(''),
    /** 当日の出席（主催者が記録） */
    attended: integer('attended', { mode: 'boolean' }).notNull().default(false),
    /** 参加費の支払い（主催者が記録） */
    paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index('event_participants_user_idx').on(t.userId)],
)

export const eventItems = sqliteTable(
  'event_items',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: ITEM_KINDS }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    note: text('note').notNull().default(''),
    /** 共有の持ち物を用意する人 */
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    prepared: integer('prepared', { mode: 'boolean' }).notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('event_items_event_idx').on(t.eventId), index('event_items_assignee_idx').on(t.assigneeId)],
)

// ---------------------------------------------------------------------------
// Relations（db.query で使う）
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  divisions: many(userDivisions),
  posts: many(blogPosts),
}))

export const userDivisionsRelations = relations(userDivisions, ({ one }) => ({
  user: one(users, { fields: [userDivisions.userId], references: [users.id] }),
}))

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
}))

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
  participants: many(eventParticipants),
  items: many(eventItems),
}))

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, { fields: [eventParticipants.eventId], references: [events.id] }),
  user: one(users, { fields: [eventParticipants.userId], references: [users.id] }),
}))

export const eventItemsRelations = relations(eventItems, ({ one }) => ({
  event: one(events, { fields: [eventItems.eventId], references: [events.id] }),
  assignee: one(users, { fields: [eventItems.assigneeId], references: [users.id] }),
}))
