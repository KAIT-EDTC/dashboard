import { relations, sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import {
  APPROVAL_STEPS,
  BLOG_STATUSES,
  COMMENTABLE_FIELDS,
  ITEM_KINDS,
  OFFICERS,
  PARTICIPANT_ROLES,
  HOSTINGS,
  REPORT_KINDS,
  REPORT_STATUSES,
  RSVP_STATUSES,
  type ApprovalStep,
  type BlogPostContent,
  type CategoryTone,
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
  /** 管理者がダッシュボードの「ユーザー管理」で変更する。最初に登録した人は管理者になる */
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
    /** 旧ルールの記事ID末尾（廃止。新しい記事では使わない） */
    slug: text('slug').notNull().default(''),
    /** イベント種別ID（BLOG_SERIES）。記事IDの末尾になる */
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
    /** 提出時点の記事ID（YY-MM-DD-イベント種別[-連番]）。一度公開したら変更できない */
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

/** ブログ記事のイベント種別。id は記事IDの末尾（管理者が作成時に決め、後から変えられない） */
export const blogSeries = sqliteTable('blog_series', {
  id: text('id').primaryKey(),
  label: text('label').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamps.createdAt,
})

/** イベントの種類（活動・ミーティングなど）。名前を変えても id は変わらない */
export const eventCategories = sqliteTable('event_categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull().unique(),
  /** バッジ・カレンダーの色（CATEGORY_TONES） */
  tone: text('tone').$type<CategoryTone>().notNull().default('neutral'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamps.createdAt,
})

/** 記事に付けられるタグ。管理者がダッシュボードで管理し、記事には表示名で保存する */
export const blogTags = sqliteTable('blog_tags', {
  id: text('id').primaryKey(),
  label: text('label').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamps.createdAt,
})

/** ブログ提出時にDiscordでメンションするレビュー担当。管理者が「ユーザー管理」で選ぶ */
export const blogReviewers = sqliteTable('blog_reviewers', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamps.createdAt,
})

/**
 * Discord通知の設定（1行だけ。id は常に 1）。行が無ければ「通知先なし・すべてオン」として扱う。
 * webhook_url は管理者が「通知設定」で入力する。画面には返さず、末尾だけ見せる
 */
export const notificationSettings = sqliteTable('notification_settings', {
  id: integer('id').primaryKey(),
  webhookUrl: text('webhook_url'),
  onEventCreated: integer('on_event_created', { mode: 'boolean' }).notNull().default(true),
  onBlogSubmitted: integer('on_blog_submitted', { mode: 'boolean' }).notNull().default(true),
  onBlogPublished: integer('on_blog_published', { mode: 'boolean' }).notNull().default(true),
  onBlogClosed: integer('on_blog_closed', { mode: 'boolean' }).notNull().default(true),
  onBlogFeedback: integer('on_blog_feedback', { mode: 'boolean' }).notNull().default(true),
  /** 活動報告書の通知（Webhookではなく、関係者へのDM） */
  onReportReviewRequested: integer('on_report_review_requested', { mode: 'boolean' }).notNull().default(true),
  onReportReviewed: integer('on_report_reviewed', { mode: 'boolean' }).notNull().default(true),
  updatedAt: timestamps.updatedAt,
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
    /** event_categories の id（管理者が増減する。使用中の種類は削除できない） */
    category: text('category').notNull(),
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
    /** 講師を置くか。置かないイベント（展示など）は講師・講師補助の役割がなく、まとめ報告書の担当者を指名する */
    hasLecturer: integer('has_lecturer', { mode: 'boolean' }).notNull().default(true),
    /** まとめ報告書の担当者（主催者が指名する）。未指名なら講師が担当 */
    summaryWriterId: text('summary_writer_id').references(() => users.id, { onDelete: 'set null' }),
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

/**
 * イベントの対象者。対象の部署と個人のどちらも無ければ全員向け。
 * 部署は指定だけを保存し、その時点の部署のメンバーを対象とする（後から部署に入った人も含む）
 */
export const eventTargetDivisions = sqliteTable(
  'event_target_divisions',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    division: text('division').$type<Division>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.division] })],
)

export const eventTargetUsers = sqliteTable(
  'event_target_users',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index('event_target_users_user_idx').on(t.userId)],
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
    /** 活動報告書（参加者それぞれ）か、まとめ報告書（イベントに1つ） */
    kind: text('kind', { enum: REPORT_KINDS }).notNull().default('activity'),
    /** 報告する所属部署。この部署の部長が承認する */
    division: text('division').$type<Division>(),
    /** 活動内容（まとめ報告書では「・」の箇条書き3行まで） */
    content: text('content').notNull().default(''),
    /** 事後報告（活動報告書のみ） */
    reflection: text('reflection').notNull().default(''),
    /** 活動評価・総合評価 1(悪)〜5(良) */
    rating: integer('rating'),
    /** 伝言事項・特記事項。承認後にイベントの連絡事項へ表示される（活動報告書のみ） */
    notes: text('notes').notNull().default(''),

    // --- まとめ報告書のみ ---
    /** 主催か参加か */
    hosting: text('hosting', { enum: HOSTINGS }),
    /** 参加者ごとの自己分析（評価は各自の活動報告書のものを使う） */
    analyses: text('analyses', { mode: 'json' }).$type<{ userId: string; text: string }[]>().notNull().default(sql`'[]'`),
    /** 総評 */
    overview: text('overview').notNull().default(''),
    /** 所感 */
    impressions: text('impressions').notNull().default(''),

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
    uniqueIndex('activity_reports_event_author_idx').on(t.eventId, t.authorId, t.kind),
    // まとめ報告書はイベントに1つ
    uniqueIndex('activity_reports_event_summary_idx').on(t.eventId).where(sql`kind = 'summary'`),
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
    /** 書き直し案（あれば本人が1クリックで反映できる） */
    suggestion: text('suggestion'),
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
  targetDivisions: many(eventTargetDivisions),
  targetUsers: many(eventTargetUsers),
  reports: many(activityReports),
}))

export const eventTargetDivisionsRelations = relations(eventTargetDivisions, ({ one }) => ({
  event: one(events, { fields: [eventTargetDivisions.eventId], references: [events.id] }),
}))

export const eventTargetUsersRelations = relations(eventTargetUsers, ({ one }) => ({
  event: one(events, { fields: [eventTargetUsers.eventId], references: [events.id] }),
  user: one(users, { fields: [eventTargetUsers.userId], references: [users.id] }),
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
