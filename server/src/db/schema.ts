import { relations, sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import {
  BLOG_STATUSES,
  EVENT_CATEGORIES,
  APPROVAL_STEPS,
  COMMENTABLE_FIELDS,
  ITEM_KINDS,
  OFFICERS,
  PARTICIPANT_ROLES,
  REPORT_STATUSES,
  RSVP_STATUSES,
  type BlogPostContent,
  type BlogTag,
  type Division,
  type ApprovalStep,
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
  /** 部長を務める部署。ログインのたびにDiscordの部長ロールから再計算される */
  headOf: text('head_of', { mode: 'json' }).$type<Division[]>().notNull().default(sql`'[]'`),
  /** 代表・本部長。ログインのたびにDiscordロールから再計算される */
  officer: text('officer', { enum: OFFICERS }),

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
    slug: text('slug').notNull().default(''),
    description: text('description').notNull().default(''),
    authorName: text('author_name').notNull().default(''),
    tags: text('tags', { mode: 'json' }).$type<BlogTag[]>().notNull().default(sql`'[]'`),
    thumbnail: text('thumbnail'),
    body: text('body').notNull().default(''),

    // 公開フロー
    status: text('status', { enum: BLOG_STATUSES }).notNull().default('draft'),
    /** 提出時点の内容。PRのブランチは常にこのスナップショットから作り直す */
    submittedContent: text('submitted_content', { mode: 'json' }).$type<BlogPostContent>(),
    /** 提出時点の記事ID（YY-MM-DD-slug）。一度公開したら変更できない */
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
    /** 活動での役割（主催者が決める）。講師は1イベントにつき1人まで */
    role: text('role', { enum: PARTICIPANT_ROLES }).notNull().default('assistant'),
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
// 活動報告書
// ---------------------------------------------------------------------------

/**
 * 活動日時・活動名・実施場所はイベント、役割は event_participants が正なので持たない。
 * 1イベントにつき1人1枚
 */
export const activityReports = sqliteTable(
  'activity_reports',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 報告する所属部署。この部署の部長が承認する */
    division: text('division').$type<Division>(),
    content: text('content').notNull().default(''),
    reflection: text('reflection').notNull().default(''),
    /** 活動評価 1(悪)〜5(良) */
    rating: integer('rating'),
    /** 伝言事項・特記事項。承認後にイベントの連絡事項へ表示される */
    notes: text('notes').notNull().default(''),

    status: text('status', { enum: REPORT_STATUSES }).notNull().default('draft'),
    submittedAt: text('submitted_at'),
    /** 提出時に提出者の立場から決めた承認の流れ（部員: 部署長 / 役職者: 選んだ承認者） */
    approvalSteps: text('approval_steps', { mode: 'json' }).$type<ApprovalStep[]>().notNull().default(sql`'[]'`),
    /** 役職者が選んだ承認者（自分以外の部署長・本部長・代表） */
    approverId: text('approver_id').references(() => users.id, { onDelete: 'set null' }),
    /** いま確認している段階（approvalSteps の位置）。差し戻されても進んだ段階は保つ */
    currentStep: integer('current_step').notNull().default(0),
    approvedAt: text('approved_at'),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('activity_reports_event_author_idx').on(t.eventId, t.authorId),
    index('activity_reports_author_idx').on(t.authorId),
    index('activity_reports_status_division_idx').on(t.status, t.division),
  ],
)

/** 承認・差し戻しの履歴（段階ごとに1行） */
export const activityReportReviews = sqliteTable(
  'activity_report_reviews',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id')
      .notNull()
      .references(() => activityReports.id, { onDelete: 'cascade' }),
    reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    step: text('step', { enum: APPROVAL_STEPS }).notNull(),
    decision: text('decision', { enum: ['approve', 'reject'] }).notNull(),
    /** 報告書全体へのコメント */
    comment: text('comment').notNull().default(''),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('activity_report_reviews_report_idx').on(t.reportId)],
)

/** 差し戻し時に本文の範囲へ付けるコメント（PRレビューの行コメントのようなもの） */
export const activityReportComments = sqliteTable(
  'activity_report_comments',
  {
    id: text('id').primaryKey(),
    reviewId: text('review_id')
      .notNull()
      .references(() => activityReportReviews.id, { onDelete: 'cascade' }),
    field: text('field', { enum: COMMENTABLE_FIELDS }).notNull(),
    /** コメントした時点の本文での位置（UTF-16）。本文が直されたら quote で探し直す */
    start: integer('start').notNull(),
    end: integer('end').notNull(),
    quote: text('quote').notNull(),
    body: text('body').notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('activity_report_comments_review_idx').on(t.reviewId)],
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
  reports: many(activityReports),
}))

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, { fields: [eventParticipants.eventId], references: [events.id] }),
  user: one(users, { fields: [eventParticipants.userId], references: [users.id] }),
}))

export const eventItemsRelations = relations(eventItems, ({ one }) => ({
  event: one(events, { fields: [eventItems.eventId], references: [events.id] }),
  assignee: one(users, { fields: [eventItems.assigneeId], references: [users.id] }),
}))

export const activityReportsRelations = relations(activityReports, ({ one, many }) => ({
  event: one(events, { fields: [activityReports.eventId], references: [events.id] }),
  author: one(users, { fields: [activityReports.authorId], references: [users.id], relationName: 'reportAuthor' }),
  approver: one(users, { fields: [activityReports.approverId], references: [users.id], relationName: 'reportApprover' }),
  reviews: many(activityReportReviews),
}))

export const activityReportReviewsRelations = relations(activityReportReviews, ({ one, many }) => ({
  report: one(activityReports, { fields: [activityReportReviews.reportId], references: [activityReports.id] }),
  reviewer: one(users, { fields: [activityReportReviews.reviewerId], references: [users.id] }),
  comments: many(activityReportComments),
}))

export const activityReportCommentsRelations = relations(activityReportComments, ({ one }) => ({
  review: one(activityReportReviews, { fields: [activityReportComments.reviewId], references: [activityReportReviews.id] }),
}))
