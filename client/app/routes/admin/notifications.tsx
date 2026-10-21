import { NOTIFICATION_KINDS, type NotificationKind } from '@edtc/shared'
import { Navigate, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Checkbox, SelectField } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MemberPicker } from '~/features/members/MemberPicker'
import { api, ApiError, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import type { Route } from './+types/notifications'

export const meta: Route.MetaFunction = () => [{ title: '通知設定 | EDTC ダッシュボード' }]

type Change =
  | { intent: 'save'; enabled: Record<NotificationKind, boolean> }
  | { intent: 'channel'; target: Target; channelId: string | null }
  | { intent: 'test'; target: Target }
  | { intent: 'reviewers'; userIds: string[] }

type Target = 'event' | 'blog'

type ActionResult = FormErrors | { ok: true }

export async function clientLoader() {
  const [settings, { members }, { userIds }, channelList] = await Promise.all([
    unwrap(api.admin.notifications.$get()),
    unwrap(api.members.$get()),
    unwrap(api.admin['blog-reviewers'].$get()),
    // 一覧を取れなくても画面は開く（理由を通知先の欄に出す）
    unwrap(api.admin.notifications.channels.$get()).catch((error) => {
      if (error instanceof ApiError) return { channels: [], error: error.message }
      throw error
    }),
  ])
  return { ...settings, members, reviewerIds: userIds, channelList }
}

/** 保存・通知先の変更・テスト送信・レビュー担当の変更は、intent 付きの JSON で送られてくる */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<ActionResult> {
  const change = (await request.json()) as Change
  const result = await catchApiError(() => {
    switch (change.intent) {
      case 'save':
        return unwrap(api.admin.notifications.$put({ json: { enabled: change.enabled } }))
      case 'channel':
        return unwrap(api.admin.notifications.$put({ json: { [`${change.target}ChannelId`]: change.channelId } }))
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

  const { botConfigured, channels, channelList, enabled, members, reviewerIds } = loaderData
  return (
    <>
      <PageHeader title="通知設定" description="Discordの通知先チャンネルとテスト送信、通知の種類、ブログのレビュー担当を管理します。各項目は個別に保存されます。" />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '720px' })}>
        <ChannelsCard botConfigured={botConfigured} channels={channels} channelList={channelList} />
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

type ChannelList = { channels: { id: string; name: string }[]; error?: string }

function ChannelsCard({ botConfigured, channels, channelList }: { botConfigured: boolean; channels: Record<Target, string | null>; channelList: ChannelList }) {
  return (
    <Card title="通知先">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
          通知を送るDiscordチャンネルを選びます。変更はその場で保存されます。「通知しない」を選ぶと、その通知は送られません。
        </p>
        {!botConfigured && (
          <Alert>
            Botがまだ設定されていないため、チャンネルを選べません。サーバーを管理している人に、Botのトークン（<code>DISCORD_BOT_TOKEN</code>）の設定を頼んでください。
          </Alert>
        )}
        {channelList.error && <Alert>{channelList.error}</Alert>}
        {TARGETS.map((target) => (
          <ChannelRow
            key={target.id}
            target={target}
            channelId={channels[target.id]}
            channels={channelList.channels}
            disabled={!botConfigured || Boolean(channelList.error)}
          />
        ))}
      </div>
    </Card>
  )
}

function ChannelRow({
  target,
  channelId,
  channels,
  disabled,
}: {
  target: (typeof TARGETS)[number]
  channelId: string | null
  channels: ChannelList['channels']
  disabled: boolean
}) {
  const fetcher = useFetcher<ActionResult>()
  const testFetcher = useFetcher<ActionResult>()
  const error = fetcher.state === 'idle' ? errorOf(fetcher.data) : undefined
  const testResult = testFetcher.state === 'idle' ? testFetcher.data : undefined
  const testError = errorOf(testResult)
  // 保存中は選んだ値を見せる（反映を待つ間に選択が元に戻って見えないように）
  const sent = fetcher.json as Extract<Change, { intent: 'channel' }> | undefined
  const value = (fetcher.state !== 'idle' ? sent?.channelId : channelId) ?? ''
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'sm' })}>
        <SelectField
          label={target.label}
          className={css({ flex: '1', minW: '200px' })}
          value={value}
          disabled={disabled || fetcher.state !== 'idle'}
          onChange={(e) =>
            fetcher.submit({ intent: 'channel', target: target.id, channelId: e.currentTarget.value || null } satisfies Change, {
              method: 'post',
              encType: 'application/json',
            })
          }
        >
          <option value="">通知しない</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              # {channel.name}
            </option>
          ))}
        </SelectField>
        <Button
          loading={testFetcher.state !== 'idle'}
          disabled={disabled || !channelId}
          onClick={() => testFetcher.submit({ intent: 'test', target: target.id } satisfies Change, { method: 'post', encType: 'application/json' })}
        >
          テスト送信
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {testError && <Alert>{testError}</Alert>}
      {testResult && !testError && <Alert tone="success">テスト通知を送りました。Discordで確認してください。</Alert>}
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
