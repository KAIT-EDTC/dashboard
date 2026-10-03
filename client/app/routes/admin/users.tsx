import { Navigate, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Card } from '~/components/ui/Card'
import { SelectField } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MemberPicker } from '~/features/members/MemberPicker'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { Route } from './+types/users'

export const meta: Route.MetaFunction = () => [{ title: 'ユーザー管理 | EDTC ダッシュボード' }]

type Role = 'member' | 'admin'
type Change = { intent: 'role'; userId: string; role: Role } | { intent: 'reviewers'; userIds: string[] }

export async function clientLoader() {
  const [{ members }, { userIds }] = await Promise.all([unwrap(api.members.$get()), unwrap(api.admin['blog-reviewers'].$get())])
  return { members, reviewerIds: userIds }
}

/** 変更ごとに JSON で送られてくる。保存後はローダーが再実行されて一覧が更新される */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const change = (await request.json()) as Change
  const result = await catchApiError(() =>
    change.intent === 'role'
      ? unwrap(api.admin.users[':id'].role.$put({ param: { id: change.userId }, json: { role: change.role } }))
      : unwrap(api.admin['blog-reviewers'].$put({ json: { userIds: change.userIds } })),
  )
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function UsersPage({ loaderData }: Route.ComponentProps) {
  const me = useCurrentUser()
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const { members, reviewerIds } = loaderData

  if (me.role !== 'admin') return <Navigate to="/" replace />

  const saving = fetcher.state !== 'idle'
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined
  const submit = (change: Change) => fetcher.submit(change, { method: 'post', encType: 'application/json' })

  const adminCount = members.filter((m) => m.role === 'admin').length

  return (
    <>
      <PageHeader
        title="ユーザー管理"
        description="管理者の追加・解除と、Discord通知でメンションするレビュー担当を管理します。変更はその場で保存されます。"
      />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '720px' })}>
        {error && <Alert>{error}</Alert>}

        <Card title="ブログのレビュー担当">
          <p className={css({ fontSize: 'sm', color: 'fg.muted', mb: 'md' })}>
            ブログ記事が提出されたとき、ここで選んだ人にDiscordでメンションします。未選択の場合はメンションなしで通知されます。
          </p>
          <MemberPicker
            members={members}
            value={reviewerIds}
            onChange={(userIds) => submit({ intent: 'reviewers', userIds })}
            label="レビュー担当を追加"
            disabled={saving}
          />
        </Card>

        <Card title={`メンバーの権限（管理者 ${adminCount}人 / 全${members.length}人）`}>
          <p className={css({ fontSize: 'sm', color: 'fg.muted', mb: 'md' })}>
            管理者は、すべてのイベント・記事の編集、ブログのタグ管理、このページの操作ができます。自分自身の権限は変更できません。
          </p>
          <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
            {members.map((member) => (
              <li
                key={member.id}
                className={css({ display: 'flex', alignItems: 'center', gap: 'sm', p: 'xs', pr: 'sm', borderRadius: 'md', borderWidth: '1px', borderColor: 'border', bg: 'surface' })}
              >
                <Avatar user={member} size={32} />
                <div className={css({ flex: 1, minW: 0 })}>
                  <p className={css({ fontSize: 'sm', fontWeight: '600', truncate: true })}>{fullName(member)}</p>
                  <p className={css({ fontSize: 'xs', color: 'fg.subtle', truncate: true })}>@{member.discordUsername}</p>
                </div>
                <SelectField
                  label={<span className={css({ srOnly: true })}>{fullName(member)}の権限</span>}
                  value={member.role}
                  disabled={saving || member.id === me.id}
                  onChange={(e) => submit({ intent: 'role', userId: member.id, role: e.currentTarget.value as Role })}
                  className={css({ w: '120px', flexShrink: 0 })}
                >
                  <option value="member">メンバー</option>
                  <option value="admin">管理者</option>
                </SelectField>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
