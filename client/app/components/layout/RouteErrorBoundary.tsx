import { isRouteErrorResponse, useRouteError } from 'react-router'
import { css } from 'styled-system/css'
import { ApiError } from '~/lib/api'
import { Alert } from '../ui/Alert'
import { ButtonLink } from '../ui/Button'

/** ページ単位のエラー表示。ナビゲーションは残したまま本文だけ差し替える */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const notFound = (isRouteErrorResponse(error) && error.status === 404) || (error instanceof ApiError && error.status === 404)
  const message = notFound
    ? 'お探しのページは見つかりませんでした。'
    : error instanceof ApiError
      ? error.message
      : '予期しないエラーが発生しました。時間をおいて再読み込みしてください。'

  if (!notFound) console.error(error)
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'md', maxW: '560px' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: '700' })}>{notFound ? 'ページが見つかりません' : 'エラーが発生しました'}</h1>
      <Alert tone={notFound ? 'warning' : 'danger'}>{message}</Alert>
      <ButtonLink to="/">ホームに戻る</ButtonLink>
    </div>
  )
}
