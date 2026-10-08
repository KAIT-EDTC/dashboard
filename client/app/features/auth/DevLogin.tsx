import { positionLabels } from '@edtc/shared'
import type { InferResponseType } from 'hono/client'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Spinner } from '~/components/ui/Spinner'
import { api, unwrap } from '~/lib/api'
import { catchApiError } from '~/lib/form'
import { fullName } from '~/lib/format'

export type DevLoginUser = InferResponseType<typeof api.auth.dev.users.$get, 200>['users'][number]

/** シードのダミーユーザー一覧。開発用ログインが無効なら null（サーバーが404を返す） */
export async function loadDevLoginUsers(): Promise<DevLoginUser[] | null> {
  const res = await api.auth.dev.users.$get().catch(() => null)
  return res?.ok ? (await res.json()).users : null
}

/** ローカル開発用: ダミーユーザーを選んでログインする */
export function DevLogin({ users }: { users: DevLoginUser[] }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const login = async (userId: string) => {
    setPending(userId)
    setError(undefined)
    const result = await catchApiError(() => unwrap(api.auth.dev.login.$post({ json: { userId } })))
    if (result.errors) {
      setError(result.errors.error)
      setPending(null)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <section className={css({ mt: 'xl', pt: 'lg', borderTopWidth: '1px', borderColor: 'border', borderStyle: 'dashed' })}>
      <h2 className={css({ fontSize: 'sm', fontWeight: '700', mb: 'sm', display: 'flex', alignItems: 'center', gap: 'xs' })}>
        開発用ログイン
        <Badge tone="warning">ローカルのみ</Badge>
      </h2>
      {error && (
        <div className={css({ mb: 'sm' })}>
          <Alert>{error}</Alert>
        </div>
      )}
      {users.length === 0 ? (
        <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
          ダミーユーザーがいません。<code>npm run db:seed</code> を実行してください
        </p>
      ) : (
        <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', maxH: '360px', overflowY: 'auto' })}>
          {users.map((user) => {
            const positions = positionLabels(user)
            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => login(user.id)}
                  disabled={pending !== null}
                  className={css({
                    w: 'full',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'sm',
                    p: 'xs',
                    pr: 'sm',
                    textAlign: 'left',
                    borderRadius: 'md',
                    borderWidth: '1px',
                    borderColor: 'border',
                    bg: 'surface',
                    cursor: 'pointer',
                    _hover: { bg: 'surface.muted' },
                    _disabled: { opacity: 0.6, cursor: 'not-allowed' },
                    _focusVisible: { outline: 'none', shadow: 'focus' },
                  })}
                >
                  <Avatar user={user} size={32} />
                  <span className={css({ flex: 1, minW: 0 })}>
                    <span className={css({ display: 'block', fontSize: 'sm', fontWeight: '600', truncate: true })}>{fullName(user)}</span>
                    <span className={css({ display: 'block', fontSize: 'xs', color: 'fg.subtle', truncate: true })}>
                      {user.divisions.join('・') || '部署なし'}
                    </span>
                  </span>
                  <span className={css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '4px' })}>
                    {positions.map((label) => (
                      <Badge key={label} tone="accent">
                        {label}
                      </Badge>
                    ))}
                    {user.role === 'admin' && <Badge>管理者</Badge>}
                  </span>
                  {pending === user.id && <Spinner size="sm" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
