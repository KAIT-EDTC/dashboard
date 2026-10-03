import { NOTIFICATION_KINDS, type NotificationKind } from '@edtc/shared'
import { useState } from 'react'
import { Navigate, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Checkbox, TextField } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MemberPicker } from '~/features/members/MemberPicker'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import type { Route } from './+types/notifications'

export const meta: Route.MetaFunction = () => [{ title: '通知設定 | EDTC ダッシュボード' }]

type Change =
  | { intent: 'save'; webhookUrl?: string | null; enabled: Record<NotificationKind, boolean> }
  | { intent: 'test' }
  | { intent: 'reviewers'; userIds: string[] }

type ActionResult = FormErrors | { ok: true }

export async function clientLoader() {
  const [settings, { members }, { userIds }] = await Promise.all([
    unwrap(api.admin.notifications.$get()),
    unwrap(api.members.$get()),
    unwrap(api.admin['blog-reviewers'].$get()),
  ])
  return { ...settings, members, reviewerIds: userIds }
}

/** 保存・テスト送信・レビュー担当の変更は、intent 付きの JSON で送られてくる */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<ActionResult> {
  const change = (await request.json()) as Change
  const result = await catchApiError(() => {
    switch (change.intent) {
      case 'save':
        return unwrap(api.admin.notifications.$put({ json: { webhookUrl: change.webhookUrl, enabled: change.enabled } }))
      case 'test':
        return unwrap(api.admin.notifications.test.$post())
      case 'reviewers':
        return unwrap(api.admin['blog-reviewers'].$put({ json: { userIds: change.userIds } }))
    }
  })
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

const errorOf = (data: ActionResult | undefined) => (data && 'error' in data ? data.error : undefined)

export default function NotificationsPage({ loaderData }: Route.ComponentProps) {
  const me = useCurrentUser()
  if (me.role !== 'admin') return <Navigate to="/" replace />

  // 保存して設定が変わったら、編集中の状態を作り直す
  const { webhook, enabled, members, reviewerIds } = loaderData
  return (
    <>
      <PageHeader title="通知設定" description="Discordに送る通知の送り先と、通知の種類、ブログのレビュー担当を管理します。" />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '720px' })}>
        <SettingsForm key={JSON.stringify([webhook, enabled])} webhook={webhook} enabled={enabled} />
        <ReviewersCard members={members} reviewerIds={reviewerIds} />
      </div>
    </>
  )
}

type Webhook = { source: 'db' | 'env' | null; hint: string | null }

function SettingsForm({ webhook, enabled: saved }: { webhook: Webhook; enabled: Record<NotificationKind, boolean> }) {
  const saveFetcher = useFetcher<ActionResult>()
  const testFetcher = useFetcher<ActionResult>()
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(saved)

  const saving = saveFetcher.state !== 'idle'
  const dirty = url.trim() !== '' || NOTIFICATION_KINDS.some((kind) => enabled[kind.id] !== saved[kind.id])
  const submit = (change: Change) => saveFetcher.submit(change, { method: 'post', encType: 'application/json' })
  const saveError = saveFetcher.state === 'idle' ? errorOf(saveFetcher.data) : undefined
  const testResult = testFetcher.state === 'idle' ? testFetcher.data : undefined
  const testError = errorOf(testResult)

  const status =
    webhook.source === 'db'
      ? `設定済み（${webhook.hint}）`
      : webhook.source === 'env'
        ? `環境変数の値を使用中（${webhook.hint}）`
        : '未設定（通知は送られません）'

  return (
    <>
      <Card title="通知先">
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          {saveError && <Alert>{saveError}</Alert>}
          <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
            通知を送るチャンネルのWebhook URLを設定します。Discordのチャンネル設定 →
            連携サービス → ウェブフックで作成できます。URLは保存すると画面には表示されません。
          </p>
          <p className={css({ fontSize: 'sm' })}>
            <span className={css({ fontWeight: '600', mr: 'sm' })}>現在</span>
            {status}
          </p>
          <TextField
            label="新しいWebhook URL"
            type="url"
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            placeholder="https://discord.com/api/webhooks/…"
            hint="入力して保存すると、通知先が置き換わります"
          />
          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>
            <Button variant="primary" loading={saving} disabled={!dirty} onClick={() => submit({ intent: 'save', ...(url.trim() && { webhookUrl: url.trim() }), enabled })}>
              保存
            </Button>
            <Button
              loading={testFetcher.state !== 'idle'}
              disabled={!webhook.source || dirty}
              onClick={() => testFetcher.submit({ intent: 'test' }, { method: 'post', encType: 'application/json' })}
            >
              テスト送信
            </Button>
            {webhook.source === 'db' && (
              <Button variant="danger" disabled={saving} onClick={() => confirm('通知先を削除しますか？環境変数に値がなければ通知は送られなくなります。') && submit({ intent: 'save', webhookUrl: null, enabled })}>
                通知先を削除
              </Button>
            )}
          </div>
          {testError && <Alert>{testError}</Alert>}
          {testResult && !testError && <Alert tone="success">テスト通知を送りました。Discordで確認してください。</Alert>}
          {!webhook.source && <Alert tone="warning">通知先が未設定のため、イベントやブログの通知は送られません。</Alert>}
        </div>
      </Card>

      <Card title="通知の種類">
        <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
          {NOTIFICATION_KINDS.map((kind) => (
            <li key={kind.id}>
              <Checkbox
                label={
                  <span>
                    <span className={css({ fontWeight: '600' })}>{kind.label}</span>
                    <span className={css({ display: 'block', fontSize: 'xs', color: 'fg.subtle' })}>{kind.description}</span>
                  </span>
                }
                checked={enabled[kind.id]}
                onChange={(e) => setEnabled({ ...enabled, [kind.id]: e.currentTarget.checked })}
              />
            </li>
          ))}
        </ul>
        <p className={css({ fontSize: 'xs', color: 'fg.subtle', mt: 'md' })}>変更は上の「保存」で反映されます。</p>
      </Card>
    </>
  )
}

function ReviewersCard({ members, reviewerIds }: { members: React.ComponentProps<typeof MemberPicker>['members']; reviewerIds: string[] }) {
  const fetcher = useFetcher<ActionResult>()
  const error = fetcher.state === 'idle' ? errorOf(fetcher.data) : undefined
  return (
    <Card title="ブログのレビュー担当">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        {error && <Alert>{error}</Alert>}
        <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
          ブログ記事が提出されたとき、ここで選んだ人にDiscordでメンションします。未選択の場合はメンションなしで通知されます。変更はその場で保存されます。
        </p>
        <MemberPicker
          members={members}
          value={reviewerIds}
          onChange={(userIds) => fetcher.submit({ intent: 'reviewers', userIds }, { method: 'post', encType: 'application/json' })}
          label="レビュー担当を追加"
          disabled={fetcher.state !== 'idle'}
        />
      </div>
    </Card>
  )
}
