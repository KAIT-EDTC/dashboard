import type { D1Database } from '@cloudflare/workers-types'
import type { Division, Officer } from '@edtc/shared'

// クライアントが AppType を型importする際にも解決できるよう、グローバル型に頼らず明示的にimportする
export type Bindings = {
  DB: D1Database

  FRONTEND_URL: string
  COOKIE_DOMAIN?: string
  JWT_SECRET: string

  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  DISCORD_REDIRECT_URI: string
  DISCORD_GUILD_ID: string
  /** 通知用Webhook URL。未設定なら通知しない */
  DISCORD_WEBHOOK_URL?: string
  /** 活動報告書の通知を関係者だけにDMで送るためのBotトークン。未設定ならDMを送らない */
  DISCORD_BOT_TOKEN?: string

  /** ブログ記事のPR先 (owner/repo) */
  BLOG_REPO: string
  /** PR先リポジトリで記事フォルダを置くディレクトリ（例: content/blog） */
  BLOG_CONTENT_DIR: string
  /** 公開サイトのURL（例: https://kaitedtc.com）。公開通知で <URL>/blog/<記事ID> へリンクする */
  BLOG_SITE_URL?: string
  GITHUB_APP_ID?: string
  GITHUB_APP_PRIVATE_KEY?: string
  GITHUB_WEBHOOK_SECRET?: string

  /** "true" のとき、ログイン画面からシードのダミーユーザーを選んでログインできる（ローカル開発専用） */
  DEV_LOGIN?: string
}

export type Role = 'member' | 'admin'

export type Session = {
  userId: string
  role: Role
  /** 部署長を務める部署 */
  headOf: Division[]
  /** 代表・本部長 */
  officer: Officer | null
}

export type AppEnv = {
  Bindings: Bindings
  Variables: {
    session: Session
  }
}
