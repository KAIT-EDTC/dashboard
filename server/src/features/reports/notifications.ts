import type { Division } from '@edtc/shared'
import type { Bindings } from '../../env'
import { divisionHeadRoleId, EMBED_COLORS, mention, mentionRole, notify } from '../../lib/discord'

const dashboardUrl = (env: Bindings, reportId: string) => `${env.FRONTEND_URL}/reports/${reportId}`

export function notifySubmitted(
  env: Bindings,
  report: { id: string; eventTitle: string; authorName: string; division: Division },
  isResubmission: boolean,
) {
  const head = divisionHeadRoleId(env, report.division)
  return notify(env, {
    content: [
      head && mentionRole(head),
      isResubmission ? '🔄 活動報告書の修正版が提出されました。' : '📝 活動報告書が提出されました。確認をお願いします！',
    ]
      .filter(Boolean)
      .join(' '),
    mentionRoleIds: head ? [head] : [],
    embeds: [
      {
        title: report.eventTitle,
        url: dashboardUrl(env, report.id),
        color: EMBED_COLORS.info,
        fields: [
          { name: '提出者', value: report.authorName, inline: true },
          { name: '所属部署', value: report.division, inline: true },
        ],
      },
    ],
  })
}

export function notifyReviewed(
  env: Bindings,
  report: {
    id: string
    authorId: string
    eventTitle: string
    reviewerName: string
    decision: 'approve' | 'reject'
    comment: string
  },
) {
  const approved = report.decision === 'approve'
  return notify(env, {
    content: approved
      ? `✅ ${mention(report.authorId)} さんの活動報告書が承認されました。`
      : `✏️ ${mention(report.authorId)} さんの活動報告書が差し戻されました。内容を直して再提出してください。`,
    mentionUserIds: [report.authorId],
    embeds: [
      {
        title: report.eventTitle,
        url: dashboardUrl(env, report.id),
        description: report.comment || undefined,
        color: approved ? EMBED_COLORS.success : EMBED_COLORS.warning,
        fields: [{ name: '確認者', value: report.reviewerName, inline: true }],
      },
    ],
  })
}
