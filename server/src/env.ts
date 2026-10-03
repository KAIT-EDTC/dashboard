import type { D1Database } from '@cloudflare/workers-types'
import type { Division } from '@edtc/shared'

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
  /** 部署ごとの部長ロールID（例: 営業部:123,総務部:456）。活動報告書の承認者になる */
  DISCORD_DIVISION_HEAD_ROLE_IDS?: string
  /** 通知用Webhook URL。未設定なら通知しない */
  DISCORD_WEBHOOK_URL?: string

  /** ブログ記事のPR先 (owner/repo) */
  BLOG_REPO: string
  /** PR先リポジトリで記事フォルダを置くディレクトリ（例: content/blog） */
  BLOG_CONTENT_DIR: string
  /** 公開サイトのURL（例: https://kaitedtc.com）。公開通知で <URL>/blog/<記事ID> へリンクする */
  BLOG_SITE_URL?: string
  GITHUB_APP_ID?: string
  GITHUB_APP_PRIVATE_KEY?: string
  GITHUB_WEBHOOK_SECRET?: string
}

export type Role = 'member' | 'admin'

export type Session = {
  userId: string
  role: Role
  /** 部長を務める部署 */
  headOf: Division[]
}

export type AppEnv = {
  Bindings: Bindings
  Variables: {
    session: Session
  }
}
