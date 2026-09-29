# EDTC ダッシュボード

EDTCメンバー専用サイト。イベントの出欠・持ち物・集金、サイト（[EDTCHP](https://github.com/KAIT-EDTC/EDTCHP)）へのブログ投稿、メンバー紹介をまとめて扱う。

- **ログイン**: Discord OAuth。EDTCのDiscordサーバーのメンバーだけが使える。初回はサーバーニックネーム（`2424013: 山田 太郎`）から学籍情報を読み取って登録する
- **イベント**: 出欠（参加/未定/不参加・コメント・定員・回答期限）、持ち物（各自持参／共有の担当者・準備状況）、参加費の集金と当日の出席記録、カレンダー表示。作成時にDiscordへ通知
- **ブログ**: Markdownで書き（画像は貼り付け・ドラッグ＆ドロップ可）、提出するとGitHub App経由でEDTCHPにPRを作成。レビューや公開はWebhookで追跡し、執筆者にDiscordで通知
- **メンバー**: 名簿（学年・部署・趣味で検索）とプロフィール（自己紹介・興味・リンク・書いた記事）

## 構成

```
.
├── shared/   # client と server で共有する定数・zodスキーマ・学籍番号の解析・記事Markdownの生成
├── server/   # Cloudflare Workers + Hono + Drizzle (D1)
└── client/   # React Router v7 (SPAモード) + Panda CSS
```

npm workspaces のモノレポ。client は server の `AppType` を型として import し、Hono RPC でエンドツーエンドに型付けする（入力は `shared` の zod スキーマでサーバー・クライアント両方が検証する）。

### server/src

```
app.ts                 # ルーティングの組み立て・CORS/CSRF・エラーハンドリング。AppType を export
env.ts                 # Bindings（環境変数）とセッションの型
db/schema.ts           # テーブル定義（users, user_divisions, events, event_participants, event_items, blog_posts, blog_images）
middleware/auth.ts     # requireAuth（ロールは毎回DBから読む）と権限チェック
lib/                   # discord（OAuth・Webhook通知）、github（App認証・Webhook署名検証）など外部サービス
features/
  auth/                # OAuth・新規登録・セッションCookie
  members/             # 名簿・プロフィール
  events/              # イベント・出欠・持ち物
  blog/                # 下書き・画像・提出（publisher.ts）・GitHub Webhook
```

### client/app

```
routes.ts              # URL とルートモジュールの対応
routes/                # 1URL = 1ファイル。clientLoader / clientAction でデータを読み書きし、features の部品を並べるだけ
features/<機能>/        # その機能だけで使うUI・フォーム変換・型
components/ui/         # 機能に依存しない部品（Button, Field, Card, Badge, Avatar, Alert, Icons…）
components/layout/     # AppShell（ログイン後の枠）, PublicShell, ルート単位のエラー表示
lib/                   # APIクライアント（unwrap で401→/login）、フォーム補助、日付整形
theme/ (client直下)     # Panda のトークン・グローバルCSS
```

- データ取得は `useEffect` ではなく `clientLoader`、更新は `<Form>` / `useFetcher` → `clientAction`。更新後は React Router が自動で再取得する
- 認証は `routes/app-layout.tsx` の `clientLoader` が `/api/members/me` を呼び、401なら `/login` へ。子ルートからは `useCurrentUser()` でログイン中のユーザーを取れる
- スタイルは Panda CSS。色は意味ベースのトークン（`surface`, `fg.muted`, `accent`, `border` …）だけを使う

## 権限

| | 一般メンバー | 管理者 |
| --- | --- | --- |
| イベント作成・出欠回答 | ○ | ○ |
| イベントの編集・持ち物の追加・出席/集金の記録 | 自分が作成したものだけ | すべて |
| 共有の持ち物を「担当する」・準備完了 | 自分の担当分 | すべて |
| ブログの編集・提出 | 自分の記事だけ | すべて |
| 他人の下書きの閲覧 | × | ○ |

管理者は `DISCORD_ADMIN_ROLE_IDS` に指定したDiscordロールを持つ人。ログインのたびに再判定する。

## ブログ

### 公開フロー

1. ダッシュボードで記事を書く（イベントページの「ブログを書く」からだとタイトルと日付を引き継ぐ）。画像はブラウザでWebP（最大1600px）に変換してから保存される
2. 「提出する」で、記事フォルダ（`index.md` と画像）を1コミットにまとめたPRが EDTCHP に作られ、Discordに通知される。PRの「Files changed」で本文を画像つきで確認できる
3. レビューコメント・修正依頼・承認・マージ・クローズはWebhookで受け取り、執筆者にメンションで通知。マージされると「公開済み」になる
4. 修正して再提出すると同じPRが更新される

PRのブランチは提出のたびに「最新の main + 記事の1コミット」として作り直す。そのため **記事の正はダッシュボード** で、PR上で直接コミットした修正は次の再提出で上書きされる。

### 記事ファイルの形式（EDTCHP側はこれを読む）

```
<BLOG_CONTENT_DIR>/            # 既定: content/blog（wrangler.jsonc の vars で変更）
└── 26-10-17-yugyou05/         # 記事ID = YY-MM-DD-slug（イベント実施日 + 半角英数字と_）
    ├── index.md
    ├── img-k3x9a0qz.webp      # サムネイル・本文の画像（WebP, 最大幅1600px）
    └── img-p2m81c7d.webp
```

```markdown
---
title: "第5回 遊行塾ではんだ付けに挑戦！"
date: 2026-10-17                  # イベント実施日
author: "山田　太郎"
description: "ライントレーサーのはんだ付けを行いました"
tags: ["遊行塾"]                  # shared/src/blog.ts の BLOG_TAGS から選ぶ
thumbnail: ./img-k3x9a0qz.webp
---

## 当日の様子

![はんだ付けをする生徒の手元](./img-p2m81c7d.webp)
```

- 本文は標準的なMarkdown（GFM）。改行だけでは段落は分かれない（空行で区切る）
- 画像は必ず記事フォルダ内のファイルを相対パスで参照し、altが付いている（提出時にチェックする）。外部画像・HTMLの `<img>` `<script>` `<iframe>` は提出できない
- 公開通知のリンクは `<BLOG_SITE_URL>/blog/<記事ID>` になる

## 開発

Node.js 22 以上が必要（`.nvmrc`）。

```sh
npm install                        # client の Panda CSS 生成も走る
cp server/.dev.vars.example server/.dev.vars   # 値を埋める
cp client/.env.example client/.env
npm run db:migrate                 # ローカルD1にマイグレーションを適用
npm run dev                        # client: http://localhost:5173 / server: http://localhost:8787
```

| コマンド | 内容 |
| --- | --- |
| `npm run typecheck` | 全ワークスペースの型チェック |
| `npm run lint` | client の ESLint |
| `npm run build` | client のビルド（`client/build/client` に静的ファイル） |
| `npm run db:generate` | `server/src/db/schema.ts` からマイグレーションを生成 |

> スキーマを作り直したため、マイグレーションは `0000_init.sql` から始まる。以前のスキーマをローカルD1に適用していた場合は `server/.wrangler/state` を削除してから `npm run db:migrate` する。

## 外部サービスの設定

### Discord アプリ

1. [Developer Portal](https://discord.com/developers/applications) でアプリを作り、OAuth2 の Redirects に `<APIのURL>/api/auth/callback` を登録
2. `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_REDIRECT_URI` / `DISCORD_GUILD_ID` を設定
3. スコープは `identify` と `guilds.members.read`（サーバー内のニックネームとロールを本人のトークンで読むため、Botは不要）
4. 通知したいチャンネルでWebhookを作り `DISCORD_WEBHOOK_URL` に設定。ブログ提出時にメンションしたいロール（広報部など）があれば `DISCORD_BLOG_REVIEWER_ROLE_ID`

### GitHub App（ブログ）

1. GitHub App を作成（Organization: KAIT-EDTC）
   - Repository permissions: **Contents: Read and write** / **Pull requests: Read and write** / Metadata: Read-only
   - Webhook URL: `<APIのURL>/api/webhooks/github`、Secret を決めて `GITHUB_WEBHOOK_SECRET` に設定
   - Subscribe to events: **Pull request** / **Pull request review** / **Issue comment**
2. `KAIT-EDTC/EDTCHP` にインストール
3. App ID を `GITHUB_APP_ID`、秘密鍵（ダウンロードしたPEMのまま）を `GITHUB_APP_PRIVATE_KEY` に設定
4. 記事フォルダの置き場所は `wrangler.jsonc` の `BLOG_CONTENT_DIR`（既定 `content/blog`）。公開通知で記事URLを出したい場合は `BLOG_SITE_URL`（例: `https://kaitedtc.com`）

### デプロイ（Cloudflare）

```sh
cd server
npx wrangler d1 create edtc-dashboard     # 出力された database_id を wrangler.jsonc に反映
npm run db:migrate:remote
npx wrangler secret put JWT_SECRET        # 他の秘密情報も同様に
npm run deploy
```

`wrangler.jsonc` の `FRONTEND_URL` は本番のURLに変える（CORS許可とOAuth後のリダイレクト先）。APIとフロントを別サブドメインに置く場合は `COOKIE_DOMAIN`（例: `.kaitedtc.com`）を設定する。client は `VITE_API_URL` を指定してビルドし、`client/build/client` を静的ホスティング（Cloudflare Pages など）に置く。SPAなので全パスを `index.html` にフォールバックさせること。
