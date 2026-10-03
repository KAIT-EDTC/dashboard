/** Discord通知の種類。「通知設定」でオン/オフを切り替える */
export const NOTIFICATION_KINDS = [
  { id: 'eventCreated', label: 'イベントの作成', description: '新しいイベントが登録されたとき（対象者がいればメンション）' },
  { id: 'blogSubmitted', label: 'ブログの提出', description: '記事が提出・再提出されたとき（レビュー担当をメンション）' },
  { id: 'blogPublished', label: 'ブログの公開', description: '記事のPRがマージされたとき（執筆者をメンション）' },
  { id: 'blogClosed', label: 'ブログのPRクローズ', description: '記事のPRが閉じられたとき（執筆者をメンション）' },
  { id: 'reportSubmitted', label: '活動報告書の提出', description: '報告書が提出・再提出されたとき（所属部署の部長ロールをメンション）' },
  { id: 'reportReviewed', label: '活動報告書の承認・差し戻し', description: '承認または差し戻されたとき（提出者をメンション）' },
  { id: 'blogFeedback', label: 'ブログのレビュー', description: '承認・修正依頼・コメントが届いたとき（執筆者をメンション）' },
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]['id']
export const NOTIFICATION_KIND_IDS = NOTIFICATION_KINDS.map((kind) => kind.id) as [NotificationKind, ...NotificationKind[]]

/**
 * 通知に使えるWebhook URL。サーバーがこのURLにリクエストするので、Discord以外は受け付けない
 * （任意のURLを入れられると、サーバーから内部のネットワークへリクエストさせられてしまう）
 */
export const DISCORD_WEBHOOK_URL_PATTERN = /^https:\/\/(?:discord|discordapp)\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+$/
