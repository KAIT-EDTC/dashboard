import { APPROVAL_STEP_LABELS, type ApprovalStep, type Division } from '@edtc/shared'
import type { Db } from '../../db'
import type { Bindings } from '../../env'
import { EMBED_COLORS, sendDirectMessage, sendDirectMessages } from '../../lib/discord'
import { approverIdsOf } from './queries'

/**
 * 活動報告書の通知は、関係者（その段階の承認者・書いた本人）だけにDMで送る。
 * 通知チャンネルに流すと関係ない人まで通知されるため
 */

const dashboardUrl = (env: Bindings, reportId: string) => `${env.FRONTEND_URL}/reports/${reportId}`

type ReportSummary = {
  id: string
  authorId: string
  eventTitle: string
  authorName: string
  division: Division | null
  approverId: string | null
}

/** 次に確認する人へ。提出・再提出・前の段階の承認のとき */
export async function notifyAwaitingReview(
  env: Bindings,
  db: Db,
  report: ReportSummary,
  step: ApprovalStep,
  reason: 'submitted' | 'resubmitted' | 'advanced',
) {
  if (!env.DISCORD_BOT_TOKEN) return
  const approverIds = await approverIdsOf(db, step, report)
  if (approverIds.length === 0) {
    console.warn(`活動報告書 ${report.id} を確認できる${APPROVAL_STEP_LABELS[step]}が見つからないため、DMを送れませんでした`)
    return
  }
  const message = {
    submitted: '📝 活動報告書が提出されました。確認をお願いします。',
    resubmitted: '🔄 差し戻した活動報告書が修正されました。確認をお願いします。',
    advanced: '📝 活動報告書が前の段階で承認されました。確認をお願いします。',
  }[reason]
  await sendDirectMessages(env, approverIds, {
    content: message,
    embeds: [
      {
        title: report.eventTitle,
        url: dashboardUrl(env, report.id),
        color: EMBED_COLORS.info,
        fields: [
          { name: '提出者', value: report.authorName, inline: true },
          ...(report.division ? [{ name: '所属部署', value: report.division, inline: true }] : []),
          { name: 'あなたの確認', value: APPROVAL_STEP_LABELS[step], inline: true },
        ],
      },
    ],
  })
}

export function notifyApproved(env: Bindings, report: ReportSummary) {
  return sendDirectMessage(env, report.authorId, {
    content: '✅ 活動報告書がすべての承認を受けました。イベントページに載りました。',
    embeds: [{ title: report.eventTitle, url: dashboardUrl(env, report.id), color: EMBED_COLORS.success }],
  })
}

export function notifyRejected(
  env: Bindings,
  report: ReportSummary,
  review: { reviewerName: string; step: ApprovalStep; comment: string; inlineCount: number },
) {
  return sendDirectMessage(env, report.authorId, {
    content: '✏️ 活動報告書が差し戻されました。コメントを確認して再提出してください。',
    embeds: [
      {
        title: report.eventTitle,
        url: dashboardUrl(env, report.id),
        description: review.comment || undefined,
        color: EMBED_COLORS.warning,
        fields: [
          { name: '確認者', value: `${review.reviewerName}（${APPROVAL_STEP_LABELS[review.step]}）`, inline: true },
          ...(review.inlineCount > 0 ? [{ name: '本文へのコメント', value: `${review.inlineCount}件`, inline: true }] : []),
        ],
      },
    ],
  })
}
