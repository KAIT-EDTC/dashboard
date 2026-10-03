# EDTC ダッシュボード

EDTCメンバー専用サイト。イベントの出欠・持ち物・集金、活動報告書の提出と承認、サイト（[EDTCHP_v2](https://github.com/KAIT-EDTC/EDTCHP_v2)）へのブログ投稿、メンバー紹介をまとめて扱う。

- **ログイン**: Discord OAuth。EDTCのDiscordサーバーのメンバーだけが使える。初回はサーバーニックネーム（`2424013: 山田 太郎`）から学籍情報を読み取って登録する
- **イベント**: 出欠（参加/未定/不参加・コメント・定員・回答期限）、持ち物（各自持参／共有の担当者・準備状況）、参加費の集金と当日の出席記録、カレンダー表示。作成時にDiscordへ通知
- **活動報告書**: 参加したイベントを選んで書く（活動日時・活動名・場所・役割はイベントから入る）。部員の分は所属部署の部署長、役職者の分は本人が選んだ承認者が確認し、承認するか、本文の範囲にコメント・書き直し案を付けて修正を依頼する。承認されるとイベントページに載り、伝言事項は「連絡事項」にまとまる
- **ブログ**: Markdownで書き（画像は貼り付け・ドラッグ＆ドロップ可）、提出するとGitHub App経由でEDTCHP_v2にPRを作成。レビューや公開はWebhookで追跡し、執筆者にDiscordで通知
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
db/schema.ts           # テーブル定義（users, user_divisions, events, event_participants, event_items, activity_reports(+_reviews, _comments), blog_posts, blog_images）
middleware/auth.ts     # requireAuth（ロールは毎回DBから読む）と権限チェック
lib/                   # discord（OAuth・Webhook通知）、github（App認証・Webhook署名検証）など外部サービス
features/
  auth/                # OAuth・新規登録・セッションCookie
  members/             # 名簿・プロフィール
  events/              # イベント・出欠・持ち物
  reports/             # 活動報告書（下書き・提出・承認/差し戻し・範囲コメント・提出状況）
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
| イベントの編集・持ち物の追加・出席/集金の記録・講師の指定 | 自分が作成したものだけ | すべて |
| 共有の持ち物を「担当する」・準備完了 | 自分の担当分 | すべて |
| ブログの編集・提出 | 自分の記事だけ | すべて |
| 他人の下書きの閲覧 | × | ○ |

管理者は、管理者のダッシュボード左メニュー「ユーザー管理」で追加・解除する（Discordのロールや環境変数は使わない）。

- 最初に登録した人（管理者が1人もいない状態で登録した人）は自動で管理者になる
- 自分自身の権限は変更できないので、管理者が0人になることはない。全員がログインできなくなった場合などは `wrangler d1 execute edtc-dashboard --remote --env production --command "UPDATE users SET role='admin' WHERE id='<DiscordのユーザーID>'"` で復旧する

### イベントの種類

イベントの種類（活動・対外活動・ミーティング・親睦・その他が初期値）は、管理者が「種類・種別の管理」で追加・名前変更・色の変更・並べ替え・削除する。イベントは種類をIDで持つので、名前を変えてもイベントはそのまま。使われている種類は削除できない。

### イベントの対象者

イベントの作成・編集で、対象を部署（`DIVISIONS`）と個人で指定できる。何も指定しなければ全員向け。

- 未回答の催促（ホームの「未回答 n件」・赤いバッジ）は対象者にだけ出る。対象外の人もイベントは見られて、参加の回答もできる
- 部署は指定だけを保存し、表示のたびにその部署の今のメンバーを対象として数える（あとから部署に入った人も対象になる）
- イベント詳細の参加者欄に、対象者のうち未回答の人が並ぶ
- 作成時のDiscord通知で対象者（作成者以外）にメンションする

### 活動報告書の承認

活動報告書の承認は管理者ではなく、次の役職者（どれもDiscordロールで、ログインのたびに再判定）が行う。ロールを付け替えたら、その人がログインし直すと反映される。

| 役職 | 設定 |
| --- | --- |
| 部署長 | `DISCORD_DIVISION_HEAD_ROLE_IDS`（部署ごと） |
| 本部長 | `DISCORD_GENERAL_MANAGER_ROLE_IDS` |
| 代表 | `DISCORD_REPRESENTATIVE_ROLE_IDS` |

- 部員の報告書: 報告書で選んだ所属部署の部署長が承認する
- 役職者（部署長・本部長・代表）の報告書: 提出時に、自分以外の部署長・本部長・代表から1人を承認者に選び、その人が承認する

承認済みの報告書はメンバー全員が見られる。提出後〜承認までは本人と承認する人だけが見られる。提出状況（誰が未提出・承認待ち・承認済みか）はメンバー全員が見られる。自分の報告書は自分で承認できない。

## 活動報告書

旧「シン・活動報告書.xlsx」をダッシュボードに移したもの。

1. `/reports` の「対象イベント」（参加と回答した・出席したイベントのうち、始まったもの）から選ぶと作成ページが開く（イベントページの「報告書を書く」からも同じ）。下書きは最初に保存・提出したときに作られる
2. 活動日時・活動名・実施場所はイベント、役割（講師／講師補助）はイベントの参加者一覧で主催者が決めたものが入る。講師は1イベントに1人までで、ほかの参加者は講師補助
3. 所属部署・活動内容・事後報告（500字まで）・活動評価（1〜5）・伝言事項を書いて提出する。役職者は承認者も選ぶ。文字数はリアルタイムに表示され、上限を超えると提出できない
4. 承認する人だけにDiscordのDMで確認依頼が届く（承認・差し戻しの結果も本人にDMで届く。通知チャンネルには流さない）
   - 部員: 部署長（選んだ所属部署の） → 本部長
   - 部署長（自分の部署で報告する場合）: 本部長
   - 本部長: 代表
   - 代表: 本部長
5. 確認する人は承認するか、本文をドラッグで選んでその範囲にコメントを付け（PRレビューの行コメントのように）、全体へのコメントと合わせて差し戻す。本人の編集画面では各項目の下にコメントが出て、「本文で選択」で該当箇所を選べる
6. 承認待ちの間は、本人が「提出を取り消して編集する」で下書きに戻せる。差し戻し・取り消しの後は直して再提出する
7. 承認された報告書はイベントページの「活動報告書」に、伝言事項は「連絡事項」に表示される
8. 「提出状況」タブで、直近のイベントごとに参加者全員の状況（未提出・承認待ち・差し戻し・承認済み）を確認できる。編集中の画面からほかのページへ移ると、下書きは自動で保存される

> 部署長のロールを持つ人がいない部署の部員の報告書は、承認されないまま止まる。部署長のロールは先に用意しておく。

## ブログ

### 公開フロー

1. ダッシュボードで記事を書く（イベントページの「ブログを書く」からだとタイトルと日付を引き継ぐ）。画像はブラウザでWebP（最大1600px）に変換してから保存される
2. 「提出する」で、記事フォルダ（`index.md` と画像）を1コミットにまとめたPRが EDTCHP_v2 に作られ、Discordに通知される。PRの「Files changed」で本文を画像つきで確認できる
3. レビューコメント・修正依頼・承認・マージ・クローズはWebhookで受け取り、執筆者にメンションで通知。マージされると「公開済み」になる
4. 修正して再提出すると同じPRが更新される

PRのブランチは提出のたびに「最新の main + 記事の1コミット」として作り直す。そのため **記事の正はダッシュボード** で、PR上で直接コミットした修正は次の再提出で上書きされる。

### 記事ファイルの形式（EDTCHP_v2側はこれを読む）

```
<BLOG_CONTENT_DIR>/            # 既定: content/blog（wrangler.jsonc の vars で変更）
└── 26-10-17-yugyou/           # 記事ID = YY-MM-DD-イベント種別（イベント実施日 + イベント種別。同日・同イベント種別の2件目以降は -2, -3…）
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
tags: ["遊行塾"]                  # 管理者がダッシュボードの「タグ管理」で登録したタグから選ぶ
thumbnail: ./img-k3x9a0qz.webp
---

## 当日の様子

![はんだ付けをする生徒の手元](./img-p2m81c7d.webp)
```

- 本文は標準的なMarkdown（GFM）。改行だけでは段落は分かれない（空行で区切る）
- 画像は必ず記事フォルダ内のファイルを相対パスで参照し、altが付いている（提出時にチェックする）。外部画像・HTMLの `<img>` `<script>` `<iframe>` は提出できない
- 記事IDは執筆者が入力せず、イベント種別（初期値は yugyou / event / outreach / play / other）の選択とイベント実施日から、初回提出時にサーバーが決める。一度公開した記事の日付・イベント種別は変えられない
- イベント種別は管理者がダッシュボードの「種類・種別の管理」で追加・名前変更・並べ替え・削除する。**種別のID（記事IDとEDTCHPの記事フォルダ名の一部になる）は半角英小文字で始まる英小文字と数字の2〜20文字で、作成後は変えられない**（名前だけ変えられる）。記事で使われている種別は削除できない
- 旧ルール（`YY-MM-DD-slug`、例: `26-05-16-yugyou01`）で提出済みの記事IDはそのまま使い続ける
- タグは管理者がダッシュボードの「タグ管理」で追加・名前変更・並べ替え・削除する。名前を変えると記事のタグも更新され、使用中のタグは削除できない
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
| `npm run db:seed` | ローカルD1にダミーのメンバー20人とイベント（出欠・持ち物つき）を入れる。何度実行しても同じ状態になる |
| `npm run db:seed:clear` | ダミーデータだけを消す |

ダミーデータ（`server/seed/`）はIDが `seed-` で始まり、自分のユーザーやデータには触らない。学年とイベントの日付は実行した日を基準に計算する。ダミーメンバーは実在のDiscordユーザーではないので、Discordのメンションは届かない。`--local` 固定のため本番のD1には入らない。

> スキーマを作り直したため、マイグレーションは `0000_init.sql` から始まる。以前のスキーマをローカルD1に適用していた場合は `server/.wrangler/state` を削除してから `npm run db:migrate` する。

## 外部サービスの設定

### Discord アプリ

1. [Developer Portal](https://discord.com/developers/applications) でアプリを作り、OAuth2 の Redirects に `<APIのURL>/api/auth/callback` を登録
2. `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_REDIRECT_URI` / `DISCORD_GUILD_ID` を設定
3. スコープは `identify` と `guilds.members.read`（サーバー内のニックネームとロールを本人のトークンで読むため、ログインにBotは不要）
4. 通知したいチャンネルでWebhookを作り、ダッシュボードの「通知設定」に登録する（管理者のみ）。通知の種類ごとのオン/オフ、テスト送信、ブログ提出時にメンションする **レビュー担当**（メンバーのドロップダウンから選ぶ）も同じ画面で設定する
   - Webhook URLは保存すると画面には末尾しか表示されない。Discordのウェブフック以外のURLは登録できない
   - 環境変数 `DISCORD_WEBHOOK_URL` は、画面で設定するまでの代わりとして使われる（画面の設定が優先）
5. 活動報告書の承認に使う役職のロールを作って設定する。承認権限と、役職者が選べる承認者の候補、確認依頼のDMの送り先がここから決まる
   - 部署長: 部署ごとにロール（「営業部長」など）を作り、`DISCORD_DIVISION_HEAD_ROLE_IDS` に `部署名:ロールID` をカンマ区切りで設定（例: `営業部:1234,総務部:5678`）。部署名は `shared/src/divisions.ts` の表記に合わせる
   - 本部長: ロールを作り、IDを `DISCORD_GENERAL_MANAGER_ROLE_IDS` に設定（複数ならカンマ区切り）
   - 代表: ロールを作り、IDを `DISCORD_REPRESENTATIVE_ROLE_IDS` に設定（複数ならカンマ区切り）
6. 活動報告書の通知は、関係者だけに届くようBotのDMで送る（チャンネルには流さない）。Botは常駐させず、通知のときにREST APIを呼ぶだけ
   - Developer Portal のアプリの「Bot」で「Reset Token」を押してトークンを発行し、`DISCORD_BOT_TOKEN` に設定する（Privileged Gateway Intents はすべてオフでよい）
   - 「OAuth2 → URL Generator」で scope に `bot` だけを選び（Bot Permissions は何も選ばない）、生成されたURLからEDTCのサーバーに招待する
   - DMはBotと同じサーバーにいて、サーバーメンバーからのDMを許可している人にだけ届く。送り先はダッシュボードが記録している役職（ログイン時に判定）から決めるので、役職に就いた人は一度ログインしておく
   - 「通知設定」の「活動報告書の確認依頼」「活動報告書の承認・修正依頼」をオフにするとDMを送らない。`DISCORD_BOT_TOKEN` が未設定でも送らない（報告書の機能自体は動く）

### GitHub App（ブログ）

1. GitHub App を作成（Organization: KAIT-EDTC）
   - Repository permissions: **Contents: Read and write** / **Pull requests: Read and write** / Metadata: Read-only
   - Webhook URL: `<APIのURL>/api/webhooks/github`、Secret を決めて `GITHUB_WEBHOOK_SECRET` に設定
   - Subscribe to events: **Pull request** / **Pull request review** / **Issue comment**
2. `KAIT-EDTC/EDTCHP_v2` にインストール
3. App ID を `GITHUB_APP_ID`、秘密鍵（ダウンロードしたPEMのまま）を `GITHUB_APP_PRIVATE_KEY` に設定
4. 記事フォルダの置き場所は `wrangler.jsonc` の `BLOG_CONTENT_DIR`（既定 `content/blog`）。公開通知で記事URLを出したい場合は `BLOG_SITE_URL`（例: `https://kaitedtc.com`）

### デプロイ（Cloudflare Workers）

1つのWorkerが、静的ファイル（client）と `/api/*` を同じオリジンから配信する（`server/wrangler.jsonc` の `env.production`）。同一オリジンなのでCORSも `COOKIE_DOMAIN` も不要。

> **公開URLについて**: `https://dashboard.kaitedtc.com`（団体のCloudflareアカウント。`kaitedtc.com` のDNSはCloudflareで管理）。デプロイ先のアカウントは `wrangler.jsonc` の `env.production.account_id` で固定してある（個人アカウントへ誤ってデプロイしないため。アカウントIDは秘密情報ではない）。公開URLを変えるときは、`FRONTEND_URL`（`wrangler.jsonc`）・`DISCORD_REDIRECT_URI`（`wrangler secret`）・DiscordのRedirects・GitHub AppのWebhook URLを合わせて変更する。

**初回のみ**

```sh
cd server
npx wrangler login                              # 団体アカウントの権限があるCloudflareユーザーで
npx wrangler d1 create edtc-dashboard
#   → 出力された database_id を wrangler.jsonc の env.production.d1_databases に貼る
#   （wrangler の d1 create が認証エラーになる場合は、ダッシュボードのD1画面から作ってもよい）
npm run db:migrate:remote                                # テーブルを作る

# 秘密情報（値を聞かれる）。GitHub App の鍵は  < your-app.pem  でファイルから渡す
npx wrangler secret put JWT_SECRET --env production                  # openssl rand -hex 32
npx wrangler secret put DISCORD_CLIENT_ID --env production
npx wrangler secret put DISCORD_CLIENT_SECRET --env production
npx wrangler secret put DISCORD_REDIRECT_URI --env production        # https://<公開URL>/api/auth/callback
npx wrangler secret put DISCORD_GUILD_ID --env production
npx wrangler secret put DISCORD_WEBHOOK_URL --env production   # 任意（「通知設定」で登録するなら不要）
npx wrangler secret put DISCORD_BOT_TOKEN --env production              # 活動報告書のDM通知
npx wrangler secret put DISCORD_DIVISION_HEAD_ROLE_IDS --env production  # 営業部:<ロールID>,総務部:<ロールID>,...
npx wrangler secret put DISCORD_GENERAL_MANAGER_ROLE_IDS --env production # 本部長のロールID
npx wrangler secret put DISCORD_REPRESENTATIVE_ROLE_IDS --env production  # 代表のロールID
npx wrangler secret put GITHUB_APP_ID --env production
npx wrangler secret put GITHUB_APP_PRIVATE_KEY --env production < your-app.pem
npx wrangler secret put GITHUB_WEBHOOK_SECRET --env production
```

デプロイ後に外部サービス側のURLも本番向けにする。

- Discord Developer Portal → OAuth2 → Redirects に `https://<公開URL>/api/auth/callback` を追加
- GitHub App → Webhook URL を `https://<公開URL>/api/webhooks/github` に設定し、購読イベント（Pull request / Pull request review / Issue comment）にチェック

**デプロイ（毎回）**

```sh
npm run deploy    # client をビルドして wrangler deploy --env production
```

スキーマを変えた回は、デプロイの前に `npm run db:generate` でマイグレーションを作り、`npm run db:migrate:remote` を実行する。
