import { DIVISIONS, type Division, type PositionsInput } from '@edtc/shared'
import type { ReactNode } from 'react'
import { Navigate, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Card } from '~/components/ui/Card'
import { SelectField } from '~/components/ui/Field'
import { PageHeader } from '~/components/ui/PageHeader'
import { useCurrentUser } from '~/features/auth/use-current-user'
import { MemberPicker } from '~/features/members/MemberPicker'
import type { MemberListItem } from '~/features/members/types'
import { api, unwrap } from '~/lib/api'
import { catchApiError, type FormErrors } from '~/lib/form'
import { fullName } from '~/lib/format'
import type { Route } from './+types/users'

export const meta: Route.MetaFunction = () => [{ title: 'ユーザー管理 | EDTC ダッシュボード' }]

type Role = 'member' | 'admin'

export async function clientLoader() {
  return unwrap(api.members.$get())
}

type ActionInput = { intent: 'role'; userId: string; role: Role } | { intent: 'positions'; positions: PositionsInput }

/** 変更ごとに JSON で送られてくる。保存後はローダーが再実行されて一覧が更新される */
export async function clientAction({ request }: Route.ClientActionArgs): Promise<FormErrors | { ok: true }> {
  const input = (await request.json()) as ActionInput
  const result = await catchApiError(() =>
    input.intent === 'positions'
      ? unwrap(api.admin.positions.$put({ json: input.positions }))
      : unwrap(api.admin.users[':id'].role.$put({ param: { id: input.userId }, json: { role: input.role } })),
  )
  return result.errors ?? { ok: true }
}

/** いまの役職を、役職ごとのメンバー一覧にする */
function positionsOf(members: MemberListItem[]): PositionsInput {
  const divisionHeads: Partial<Record<Division, string[]>> = {}
  for (const division of DIVISIONS) divisionHeads[division] = members.filter((m) => m.headOf.includes(division)).map((m) => m.id)
  return {
    representatives: members.filter((m) => m.officer === 'representative').map((m) => m.id),
    generalManagers: members.filter((m) => m.officer === 'general_manager').map((m) => m.id),
    divisionHeads,
  }
}

/** 役職（活動報告書の承認者）。変更はその場で保存する */
function PositionsCard({ members }: { members: MemberListItem[] }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined
  const positions = positionsOf(members)
  const saving = fetcher.state !== 'idle'
  const save = (next: PositionsInput) => fetcher.submit({ intent: 'positions', positions: next }, { method: 'post', encType: 'application/json' })

  const row = (label: string, picker: ReactNode) => (
    <div key={label} className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', sm: '96px 1fr' }, gap: 'sm', alignItems: 'start' })}>
      <span className={css({ fontSize: 'sm', fontWeight: '600', pt: { sm: '8px' } })}>{label}</span>
      {picker}
    </div>
  )

  return (
    <Card title="役職">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        {error && <Alert>{error}</Alert>}
        {row(
          '代表',
          <MemberPicker
            members={members.filter((m) => !positions.generalManagers.includes(m.id))}
            value={positions.representatives}
            onChange={(representatives) => save({ ...positions, representatives })}
            label={<span className={css({ srOnly: true })}>代表を追加</span>}
            disabled={saving}
          />,
        )}
        {row(
          '本部長',
          <MemberPicker
            members={members.filter((m) => !positions.representatives.includes(m.id))}
            value={positions.generalManagers}
            onChange={(generalManagers) => save({ ...positions, generalManagers })}
            label={<span className={css({ srOnly: true })}>本部長を追加</span>}
            disabled={saving}
          />,
        )}
        {DIVISIONS.map((division) =>
          row(
            `${division}長`,
            <MemberPicker
              members={members}
              value={positions.divisionHeads[division] ?? []}
              onChange={(ids) => save({ ...positions, divisionHeads: { ...positions.divisionHeads, [division]: ids } })}
              label={<span className={css({ srOnly: true })}>{division}長を追加</span>}
              disabled={saving}
            />,
          ),
        )}
      </div>
    </Card>
  )
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
      <PageHeader title="ユーザー管理" description="役職と権限を管理します。変更はその場で保存されます。" />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '720px' })}>
        <PositionsCard members={members} />

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
                    fetcher.submit({ intent: 'role', userId: member.id, role: e.currentTarget.value as Role }, { method: 'post', encType: 'application/json' })
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
