import { HTTPException } from 'hono/http-exception'

export const badRequest = (message: string) => new HTTPException(400, { message })
export const unauthorized = (message = 'ログインが必要です') => new HTTPException(401, { message })
export const forbidden = (message = 'この操作を行う権限がありません') => new HTTPException(403, { message })
export const notFound = (message = '見つかりません') => new HTTPException(404, { message })
export const conflict = (message: string) => new HTTPException(409, { message })
