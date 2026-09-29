import type { AppType } from '@edtc/server'
import { hc, type ClientResponse } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { redirect } from 'react-router'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export const api = hc<AppType>(API_URL, { init: { credentials: 'include' } }).api

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message)
  }
}

type SuccessBody<R> = R extends ClientResponse<infer T, infer S, string> ? (S extends SuccessStatusCode ? T : never) : never

/**
 * APIのレスポンスを検査して成功時の本文を返す。
 * 401 はログイン画面へのリダイレクトとして投げるので、clientLoader / clientAction の中で使う。
 */
export async function unwrap<R extends ClientResponse<unknown, number, string>>(
  request: Promise<R>,
): Promise<SuccessBody<R>> {
  const res = await request
  if (res.status === 401) throw redirect('/login')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: Record<string, string> }
    throw new ApiError(res.status, body.error ?? 'エラーが発生しました', body.fieldErrors)
  }
  return (await res.json()) as SuccessBody<R>
}
