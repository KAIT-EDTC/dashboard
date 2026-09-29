import type { Bindings } from '../../env'
import { EMBED_COLORS, mention, mentionRole, notify } from '../../lib/discord'

type PostSummary = {
  id: string
  title: string
  authorId: string
  authorLabel: string
  prUrl: string
}

const dashboardUrl = (env: Bindings, postId: string) => `${env.FRONTEND_URL}/blog/${postId}`

export function notifySubmitted(env: Bindings, post: PostSummary, isResubmission: boolean) {
  const reviewer = env.DISCORD_BLOG_REVIEWER_ROLE_ID
  return notify(env, {
    content: [
      reviewer && mentionRole(reviewer),
      isResubmission ? '🔄 ブログ記事の修正版が提出されました。' : '📝 ブログ記事が提出されました。レビューをお願いします！',
    ]
      .filter(Boolean)
      .join(' '),
    mentionRoleIds: reviewer ? [reviewer] : [],
    embeds: [
      {
        title: post.title,
        url: post.prUrl,
        color: EMBED_COLORS.info,
        fields: [
          { name: '執筆者', value: post.authorLabel, inline: true },
          { name: 'ダッシュボード', value: dashboardUrl(env, post.id), inline: false },
        ],
      },
    ],
  })
}

export function notifyPublished(env: Bindings, post: PostSummary, articleId: string | null) {
  const siteUrl = env.BLOG_SITE_URL && articleId ? `${env.BLOG_SITE_URL.replace(/\/+$/, '')}/blog/${articleId}` : undefined
  return notify(env, {
    content: `🎉 ${mention(post.authorId)} さんのブログ記事がマージされました！まもなくサイトに公開されます。`,
    mentionUserIds: [post.authorId],
    embeds: [{ title: post.title, url: siteUrl ?? post.prUrl, color: EMBED_COLORS.success }],
  })
}

export function notifyClosed(env: Bindings, post: PostSummary) {
  return notify(env, {
    content: `↩️ ${mention(post.authorId)} さんのブログ記事のPRがクローズされました。内容を確認して再提出してください。`,
    mentionUserIds: [post.authorId],
    embeds: [{ title: post.title, url: dashboardUrl(env, post.id), color: EMBED_COLORS.warning }],
  })
}

export function notifyFeedback(
  env: Bindings,
  post: PostSummary,
  feedback: { kind: 'approved' | 'changes_requested' | 'commented'; reviewer: string; body: string; url: string },
) {
  const heading = {
    approved: '✅ ブログ記事が承認されました',
    changes_requested: '✏️ ブログ記事に修正依頼が届きました',
    commented: '💬 ブログ記事にコメントが届きました',
  }[feedback.kind]
  const body = feedback.body.length > 500 ? `${feedback.body.slice(0, 500)}…` : feedback.body
  return notify(env, {
    content: `${heading} ${mention(post.authorId)}`,
    mentionUserIds: [post.authorId],
    embeds: [
      {
        title: post.title,
        url: feedback.url,
        description: body || undefined,
        color: feedback.kind === 'changes_requested' ? EMBED_COLORS.warning : EMBED_COLORS.info,
        fields: [
          { name: 'レビュアー', value: feedback.reviewer, inline: true },
          { name: '修正はこちら', value: dashboardUrl(env, post.id), inline: false },
        ],
      },
    ],
  })
}
