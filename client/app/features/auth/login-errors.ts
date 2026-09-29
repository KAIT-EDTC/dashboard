import type { LoginError } from '@edtc/server'

export const LOGIN_ERROR_MESSAGES: Record<LoginError | 'registration_expired', string> = {
  not_a_member: 'EDTCのDiscordサーバーに参加していません。サーバーに参加してから、もう一度ログインしてください。',
  invalid_state: 'ログインの有効期限が切れました。もう一度お試しください。',
  auth_failed: 'Discordでの認証に失敗しました。もう一度お試しください。',
  registration_expired: '登録の有効期限が切れました。もう一度ログインしてください。',
}
