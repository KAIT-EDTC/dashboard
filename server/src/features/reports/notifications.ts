import { APPROVAL_STEP_LABELS, REPORT_KIND_LABELS, type ApprovalStep, type Division, type NotificationKind, type ReportKind } from '@edtc/shared'
import type { Db } from '../../db'
import type { Bindings } from '../../env'
import { EMBED_COLORS, sendDirectMessage, sendDirectMessages } from '../../lib/discord'
import { getNotificationSettings } from '../admin/notification-settings'
import { approverIdsOf } from './queries'

/**
 * 活動報告書・まとめ報告書の通知は、関係者（その段階の承認者・書いた本人）だけにDMで送る。
 * 通知チャンネルに流すと関係ない人まで通知されるため
 */

const dashboardUrl = (env: Bindings, reportId: string) => `${env.FRONTEND_URL}/reports/${reportId}`

/** 「通知設定」でオフにされていないか（DMもチャンネル通知と同じく種類ごとに止められる） */
async function isEnabled(env: Bindings, db: Db, kind: NotificationKind): Promise<boolean> {
  if (!env.DISCORD_BOT_TOKEN) return false
  try {
    return (await getNotificationSettings(db)).enabled[kind]
  } catch (error) {
    console.error('通知設定を読めませんでした', error)
    return false
  }
}

type ReportSummary = {
  id: string
  kind: ReportKind
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
  if (!(await isEnabled(env, db, 'reportReviewRequested'))) return
  const approverIds = await approverIdsOf(db, step, report)
  if (approverIds.length === 0) {
    console.warn(`${REPORT_KIND_LABELS[report.kind]} ${report.id} を確認できる${APPROVAL_STEP_LABELS[step]}が見つからないため、DMを送れませんでした`)
    return
  }
  const label = REPORT_KIND_LABELS[report.kind]
  const message = {
    submitted: `📝 ${label}が提出されました。確認をお願いします。`,
    resubmitted: `🔄 修正依頼した${label}が再提出されました。確認をお願いします。`,
    advanced: `📝 ${label}の確認をお願いします。`,
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

export async function notifyApproved(env: Bindings, db: Db, report: ReportSummary) {
  if (!(await isEnabled(env, db, 'reportReviewed'))) return
  await sendDirectMessage(env, report.authorId, {
    content: `✅ ${REPORT_KIND_LABELS[report.kind]}が承認されました。`,
    embeds: [{ title: report.eventTitle, url: dashboardUrl(env, report.id), color: EMBED_COLORS.success }],
  })
}

export async function notifyRejected(
  env: Bindings,
  db: Db,
  report: ReportSummary,
  review: { reviewerName: string; step: ApprovalStep; comment: string; inlineCount: number },
) {
  if (!(await isEnabled(env, db, 'reportReviewed'))) return
  await sendDirectMessage(env, report.authorId, {
    content: `✏️ ${REPORT_KIND_LABELS[report.kind]}に修正依頼が届きました。`,
    embeds: [
      {
        title: report.eventTitle,
        url: dashboardUrl(env, report.id),
        description: review.comment || undefined,
        color: EMBED_COLORS.warning,
        fields: [
          { name: '確認者', value: `${review.reviewerName}（${APPROVAL_STEP_LABELS[review.step]}）`, inline: true },
          ...(review.inlineCount > 0 ? [{ name: '修正依頼', value: `${review.inlineCount}件`, inline: true }] : []),
        ],
      },
    ],
  })
}
