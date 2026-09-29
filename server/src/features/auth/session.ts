import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { CookieOptions } from 'hono/utils/cookie'
import { sign, verify } from 'hono/jwt'
import type { Division } from '@edtc/shared'
import type { AppEnv, Role } from '../../env'

const SESSION_COOKIE = 'session'
const REGISTRATION_COOKIE = 'registration'
const OAUTH_STATE_COOKIE = 'oauth_state'

const SESSION_TTL = 60 * 60 * 24 * 7
const REGISTRATION_TTL = 60 * 15
const OAUTH_STATE_TTL = 60 * 10

function cookieOptions(c: Context<AppEnv>, maxAge?: number): CookieOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: c.env.FRONTEND_URL.startsWith('https://'),
    ...(c.env.COOKIE_DOMAIN && { domain: c.env.COOKIE_DOMAIN }),
    ...(maxAge !== undefined && { maxAge }),
  }
}

async function signCookie(c: Context<AppEnv>, name: string, payload: Record<string, unknown>, ttl: number) {
  const token = await sign({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl }, c.env.JWT_SECRET, 'HS256')
  setCookie(c, name, token, cookieOptions(c, ttl))
}

async function verifyCookie<T>(c: Context<AppEnv>, name: string): Promise<T | null> {
  const token = getCookie(c, name)
  if (!token) return null
  try {
    return (await verify(token, c.env.JWT_SECRET, 'HS256')) as T
  } catch {
    return null
  }
}

// --- ログインセッション ---------------------------------------------------

export async function startSession(c: Context<AppEnv>, userId: string) {
  deleteCookie(c, REGISTRATION_COOKIE, cookieOptions(c))
  await signCookie(c, SESSION_COOKIE, { sub: userId, typ: 'session' }, SESSION_TTL)
}

export async function readSessionUserId(c: Context<AppEnv>): Promise<string | null> {
  const payload = await verifyCookie<{ sub: string; typ: string }>(c, SESSION_COOKIE)
  return payload?.typ === 'session' ? payload.sub : null
}

export function endSession(c: Context<AppEnv>) {
  deleteCookie(c, SESSION_COOKIE, cookieOptions(c))
  deleteCookie(c, REGISTRATION_COOKIE, cookieOptions(c))
}

// --- 新規登録（Discord認証済み・未登録の状態） -----------------------------

export type RegistrationClaims = {
  sub: string
  username: string
  avatar: string | null
  nick: string | null
  role: Role
  headOf: Division[]
}

export async function startRegistration(c: Context<AppEnv>, claims: RegistrationClaims) {
  await signCookie(c, REGISTRATION_COOKIE, { ...claims, typ: 'registration' }, REGISTRATION_TTL)
}

export async function readRegistration(c: Context<AppEnv>): Promise<RegistrationClaims | null> {
  const payload = await verifyCookie<RegistrationClaims & { typ: string }>(c, REGISTRATION_COOKIE)
  return payload?.typ === 'registration' ? payload : null
}

// --- OAuth state（ログインCSRF対策） ---------------------------------------

export function issueOAuthState(c: Context<AppEnv>): string {
  const state = crypto.randomUUID()
  setCookie(c, OAUTH_STATE_COOKIE, state, cookieOptions(c, OAUTH_STATE_TTL))
  return state
}

export function consumeOAuthState(c: Context<AppEnv>, state: string | undefined): boolean {
  const expected = getCookie(c, OAUTH_STATE_COOKIE)
  deleteCookie(c, OAUTH_STATE_COOKIE, cookieOptions(c))
  return !!state && !!expected && state === expected
}
