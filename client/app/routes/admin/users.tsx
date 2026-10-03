import { Navigate, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Card } from '~/components/ui/Card'
import { SelectField } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { Route } from './+types/users'

export const meta: Route.MetaFunction = () => [{ title: 'ユーザー管理 | EDTC ダッシュボード' }]

type Role = 'member' | 'admin'

export async function clientLoader() {
  return unwrap(api.members.$get())
}

/** 権限の変更ごとに JSON で送られてくる。保存後はローダーが再実行されて一覧が更新される */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const { userId, role } = (await request.json()) as { userId: string; role: Role }
  const result = await catchApiError(() => unwrap(api.admin.users[':id'].role.$put({ param: { id: userId }, json: { role } })))
  return result.errors ?? { ok: true }
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function UsersPage({ loaderData }: Route.ComponentProps) {
  const me = useCurrentUser()
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const { members } = loaderData

  if (me.role !== 'admin') return <Navigate to="/" replace />

  const saving = fetcher.state !== 'idle'
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined
  const adminCount = members.filter((m) => m.role === 'admin').length

  return (
    <>
      <PageHeader title="ユーザー管理" description="メンバーの権限（管理者かどうか）を管理します。変更はその場で保存されます。" />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '720px' })}>
        {error && <Alert>{error}</Alert>}

        <Card title={`メンバーの権限（管理者 ${adminCount}人 / 全${members.length}人）`}>
          <p className={css({ fontSize: 'sm', color: 'fg.muted', mb: 'md' })}>
            管理者は、すべてのイベント・記事の編集、イベント設定・ブログ設定、通知設定、このページの操作ができます。自分自身の権限は変更できません。
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
                  onChange={(e) =>
                    fetcher.submit({ userId: member.id, role: e.currentTarget.value as Role }, { method: 'post', encType: 'application/json' })
                  }
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
