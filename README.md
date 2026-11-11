# EDTC ダッシュボード

EDTCメンバー専用サイト。イベント管理、活動報告書の提出と承認、HP ([EDTCHP_v2](https://github.com/KAIT-EDTC/EDTCHP_v2)) へのブログ投稿、メンバー紹介を一元的に管理します。

ログインには Discord のOAuth2.0 を使います。EDTC サーバーに所属していれば認証することが出来ます。

### ブログ

> [!note]
> 2026 年 10 月 18 日 以降のブログデータはダッシュボードが基準になります。

ブログは提出された後、[EDTCHP_v2](https://github.com/KAIT-EDTC/EDTCHP_v2) に Markdown ファイルと画像データのセットで PR が作られます。  
修正点がなく、問題ない場合 main にマージされ本番環境にデプロイされます。

### 権限

管理者は下の表に追加で、管理者メニューにて「ユーザー管理」「通知設定」「イベント設定」を行えます。

| 機能 | 一般メンバー | 管理者 |
| - | - | - |
| イベント作成・出欠回答 | ○ | ○ |
| イベントの編集・持ち物の追加・出席/集金の記録・講師の指定 | 自分が作成したものだけ | すべて |
| ブログの編集・提出 | 自分の記事だけ | すべて |
| 他人の下書きの閲覧 | × | ○ |

## デプロイとプレビュー

### 本番デプロイ

デプロイは、main に push すると自動で実行されます。
1 つの Worker が静的ファイル（client）と `/api/*` を同じオリジンから配信します。

### PRプレビュー

- Discordログイン・ブログ提出・通知はプレビューでは動きません。
- ログインはダミーユーザーを使います。
- D1 は Free プランだとアカウントあたり10個までなので、開いたままのPRが多いと作れないことがあります。

## 開発

Node.js 22 以上が必要です（`.nvmrc`）。

### 環境変数の設定

> [!important] 
> `.env` や `.dev.vars` は絶対にコミットに含めないでください。また、これらのファイルに記載されているものは追跡対象のファイルにハードコーディングしないように気をつけてください。  
> (`.gitignore` にどちらも含めているので普通に開発していれば気にしなくて大丈夫です。)  
> また、AI Agent が生成したファイルはコミット前に必ず確認すること。(pre-commit で secretlint をフックしています。)

#### client

```sh
cp client/.env.example client/.env
```

#### server

```sh
cp server/.dev.vars.example server/.dev.vars
```

通常の開発において必須となる環境変数は `DEV_LOGIN` のみです。(それ以外は Cloudflare で既に登録しているため)  
以下のように設定すればダミーユーザーとしてログインできます。

```sh
DEV_LOGIN=true
```

ただし、Discord の通知関連、ブログの提出関連、認証関連の開発では必要になることがあります。

<details>
<summary>Discord の 通知関連の環境変数設定</summary>

Discord の通知関連では以下の環境変数が必要になります。

- `DISCORD_GUILD_ID`
- `DISCORD_BOT_TOKEN`

ギルド ID は通知等をしたい Discord サーバの ID です。
Bot のトークンは `https://discord.com/developers/applications/` で開発用の Bot を作り取得してください。

</details>

<details>
<summary>ブログの提出関連の環境変数設定</summary>

環境変数を設定する前に、開発用の Github App を作ってください。
ブログの提出関連では以下の環境変数が必要になります。

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET` (提出後のレビューの状態等を受け取るために必要)

Github App の Private Key は App の設定の Credentials から生成し、 `.pem` をダウンロードして以下のコマンドで改行を `\n` に置き換えて追記すると楽です。(Windows では WSL か Git Bash で実行できます。)

```sh
printf 'GITHUB_APP_PRIVATE_KEY="%s"\n' "$(awk 'NF{printf "%s\\n", $0}' <.pemのファイルパス>)" >> .dev.vars
```

Webhook の Secret は、`openssl rand -base64 32` などで秘密鍵を生成して、`.dev.vars` と Github App の両方に設定してください。
ただし、`localhost` では Webhook は使えないので、 リバースプロキシを用意するなどして転送をする必要があります。

</details>

<details>
<summary>認証関連の環境変数設定</summary>

認証関連では以下の環境変数が必要になります。

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `JWT_SECRET`

上 2 つは `https://discord.com/developers/applications/` でアプリケーションを作ればすぐに取得できます。
リダイレクト URI は アプリケーションと `.dev.vars` の両方に `http://localhost:8787/api/auth/callback`を設定してください。
スコープは `identify` と `guilds.members.read` で十分です。

JWT の秘密鍵は、 `openssl rand -base64 32` で設定すると良いです。

</details>

### 初回セットアップ

以下のコマンドはリポジトリ直下で実行してください。

client, server で必要な依存関係をインストールします。

```sh
npm install
```

DB のマイグレーションを行います(対象はローカルの DB です)。

```sh
npm run db:migrate
```

### 開発サーバを立ち上げる

こちらもリポジトリ直下で実行してください。  
client は `http://localhost:8787` で、server は `https://localhost:5173` で立ち上がります。

```sh
npm run dev
```

### シード(ダミーデータ)

開発時に仮のデータを入れるときに便利です。

シードを投入(冪等)

```sh
npm run db:seed
```

シードを削除

```sh
npm run db:seed:clear
```

## 構成

npm workspaces のモノレポ構成です。  
client は Hono RPC で API を呼び出してます。

```
.
├── shared/   # client と server で共有する定数・zodスキーマ・学籍番号の解析・ブログ生成
├── server/   # Cloudflare Workers + Hono + Drizzle (D1)
└── client/   # React Router v7 (SPA) + Panda CSS
```

### server/src

```
app.ts                 # ルーティングの組み立て・CORS/CSRF・エラーハンドリング
env.ts                 # Bindings（環境変数）とセッションの型
db/schema.ts           # テーブル定義
middleware/auth.ts     # ミドルウェア
lib/                   # discord、github など外部サービス
features/              # 画面に対応する機能
```

### client/app

```
routes.ts              # URL とルートモジュールの対応
routes/                # 1URL = 1ファイル
features/              # 機能だけで使うUI・フォーム変換・型
components/ui/         # 機能に依存しないコンポーネント群
components/layout/     # AppShell（ログイン後の枠）, PublicShell, ルート単位のエラー表示
lib/                   # APIクライアント フォーム補助、日付整形
theme/ (client直下)     # Panda のトークン・グローバルCSS
```
