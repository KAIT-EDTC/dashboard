import { NOTIFICATION_KINDS, type NotificationKind } from '@edtc/shared'
import { Navigate, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Checkbox } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MemberPicker } from '~/features/members/MemberPicker'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import type { Route } from './+types/notifications'

export const meta: Route.MetaFunction = () => [{ title: '通知設定 | EDTC ダッシュボード' }]

type Change =
  | { intent: 'save'; enabled: Record<NotificationKind, boolean> }
  | { intent: 'test'; target: Target }
  | { intent: 'reviewers'; userIds: string[] }

type Target = 'event' | 'blog'

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
        return unwrap(api.admin.notifications.$put({ json: { enabled: change.enabled } }))
      case 'test':
        return unwrap(api.admin.notifications.test.$post({ json: { target: change.target } }))
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

  const { webhooks, enabled, members, reviewerIds } = loaderData
  return (
    <>
      <PageHeader title="通知設定" description="Discordの通知先の確認とテスト送信、通知の種類、ブログのレビュー担当を管理します。各項目は個別に保存されます。" />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '720px' })}>
        <WebhooksCard webhooks={webhooks} />
        <KindsCard enabled={enabled} />
        <ReviewersCard members={members} reviewerIds={reviewerIds} />
      </div>
    </>
  )
}

const TARGETS: { id: Target; label: string }[] = [
  { id: 'event', label: 'イベントの通知' },
  { id: 'blog', label: 'ブログの通知' },
]

function WebhooksCard({ webhooks }: { webhooks: Record<Target, string | null> }) {
  return (
    <Card title="通知先">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
          通知を送るDiscordチャンネルは、サーバーの設定（環境変数）で決まります。変更したいときは、サーバーを管理している人に
          Discordのチャンネルで作ったWebhook URLを渡して、イベント用は <code>DISCORD_EVENT_WEBHOOK_URL</code>、
          ブログ用は <code>DISCORD_BLOG_WEBHOOK_URL</code> に設定してもらってください。未設定の通知は送られません。
        </p>
        {TARGETS.map((target) => (
          <WebhookRow key={target.id} target={target} hint={webhooks[target.id]} />
        ))}
      </div>
    </Card>
  )
}

function WebhookRow({ target, hint }: { target: (typeof TARGETS)[number]; hint: string | null }) {
  const fetcher = useFetcher<ActionResult>()
  const result = fetcher.state === 'idle' ? fetcher.data : undefined
  const error = errorOf(result)
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'sm' })}>
        <p className={css({ fontSize: 'sm' })}>
          <span className={css({ fontWeight: '600', mr: 'sm' })}>{target.label}</span>
          {hint ? `設定済み（${hint}）` : '未設定（通知は送られません）'}
        </p>
        <Button
          loading={fetcher.state !== 'idle'}
          disabled={!hint}
          onClick={() => fetcher.submit({ intent: 'test', target: target.id } satisfies Change, { method: 'post', encType: 'application/json' })}
        >
          テスト送信
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {result && !error && <Alert tone="success">テスト通知を送りました。Discordで確認してください。</Alert>}
    </div>
  )
}

function KindsCard({ enabled: saved }: { enabled: Record<NotificationKind, boolean> }) {
  const fetcher = useFetcher<ActionResult>()
  const error = fetcher.state === 'idle' ? errorOf(fetcher.data) : undefined
  // 保存中は送信した値を見せる（反映を待つ間にチェックが元に戻って見えないように）
  const sent = fetcher.json as Extract<Change, { intent: 'save' }> | undefined
  const enabled = (fetcher.state !== 'idle' && sent?.enabled) || saved
  return (
    <Card title="通知の種類">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        {error && <Alert>{error}</Alert>}
        <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>送る通知を選びます。変更はその場で保存されます。</p>
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
                onChange={(e) =>
                  fetcher.submit(
                    { intent: 'save', enabled: { ...enabled, [kind.id]: e.currentTarget.checked } } satisfies Change,
                    { method: 'post', encType: 'application/json' },
                  )
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </Card>
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
