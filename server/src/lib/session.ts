import type { Context } from 'hono'
import { sign, verify } from 'hono/jwt'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import type { AppEnv } from '../types'

type SessionPayload = {
  sub: string
  name: string
}

type TempPayload = {
  sub: string
  name: string
  avatar: string | null
  nick: string | null
  type: 'temp'
}

export async function createSession(c: Context<AppEnv>, payload: SessionPayload) {
  const token = await sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 },
    c.env.JWT_SECRET,
    'HS256'
  )
  const isProd = c.env.NODE_ENV === 'production'
  setCookie(c, 'token', token, {
    path: '/',
    httpOnly: true,
    maxAge: 86400,
    sameSite: 'Lax',
    ...(isProd ? { domain: '.kaitedtc.com', secure: true } : {}),
  })
}

export async function createTempToken(c: Context<AppEnv>, payload: Omit<TempPayload, 'type'>) {
  const token = await sign(
    { ...payload, type: 'temp', exp: Math.floor(Date.now() / 1000) + 60 * 15 },
    c.env.JWT_SECRET,
    'HS256'
  )
  const isProd = c.env.NODE_ENV === 'production'
  setCookie(c, 'temp_token', token, {
    path: '/',
    httpOnly: true,
    maxAge: 900,
    sameSite: 'Lax',
    ...(isProd ? { domain: '.kaitedtc.com', secure: true } : {}),
  })
}

export async function verifyTempToken(c: Context<AppEnv>): Promise<TempPayload | null> {
  const token = getCookie(c, 'temp_token')
  if (!token) return null
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as unknown as TempPayload
    if (payload.type !== 'temp') return null
    return payload
  } catch {
    return null
  }
}

export function clearSession(c: Context<AppEnv>) {
  const isProd = c.env.NODE_ENV === 'production'
  const opts = {
    path: '/',
    ...(isProd ? { domain: '.kaitedtc.com', secure: true } : {}),
  }
  deleteCookie(c, 'token', opts)
  deleteCookie(c, 'temp_token', opts)
}
