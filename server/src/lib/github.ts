import { sign } from 'hono/jwt'
import type { Bindings } from '../env'

/**
 * GitHub App として GitHub API を呼び出すための最小限のクライアント。
 * 個人のアクセストークンと違い、特定の人のアカウントに依存せず、
 * 権限もインストール先リポジトリの contents / pull_requests に限定できる。
 */

const API = 'https://api.github.com'

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

// ---------------------------------------------------------------------------
// 認証（App JWT → Installation Access Token）
// ---------------------------------------------------------------------------

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const base64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))
}

function derLength(length: number): number[] {
  if (length < 0x80) return [length]
  const bytes: number[] = []
  for (let n = length; n > 0; n >>= 8) bytes.unshift(n & 0xff)
  return [0x80 | bytes.length, ...bytes]
}

/** GitHubが発行する PKCS#1 形式の鍵を WebCrypto が読める PKCS#8 に包み直す */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array<ArrayBuffer> {
  const version = [0x02, 0x01, 0x00]
  const rsaAlgorithm = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]
  const octetHeader = [0x04, ...derLength(pkcs1.length)]
  const bodyLength = version.length + rsaAlgorithm.length + octetHeader.length + pkcs1.length
  const out = new Uint8Array([0x30, ...derLength(bodyLength), ...version, ...rsaAlgorithm, ...octetHeader, ...new Array(pkcs1.length)])
  out.set(pkcs1, out.length - pkcs1.length)
  return out
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.replace(/\\n/g, '\n')
  const der = pemToDer(normalized)
  const pkcs8 = normalized.includes('BEGIN RSA PRIVATE KEY') ? pkcs1ToPkcs8(der) : der
  return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
}

async function createAppJwt(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const key = await importPrivateKey(privateKeyPem)
  // 時計のずれを考慮して iat を過去にずらす（最大有効期間は10分）
  return sign({ iat: now - 60, exp: now + 9 * 60, iss: appId }, key, 'RS256')
}

async function rawRequest<T>(token: string, scheme: 'Bearer' | 'token', method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `${scheme} ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'edtc-dashboard',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    let message = text
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text
    } catch {
      // JSONでなければ本文をそのまま使う
    }
    throw new GitHubError(res.status, `GitHub API ${method} ${path} failed (${res.status}): ${message}`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

// isolate が生きている間はトークンを使い回す（有効期限1時間）
let cachedToken: { repo: string; token: string; expiresAt: number } | undefined

async function installationToken(env: Bindings): Promise<string> {
  if (cachedToken && cachedToken.repo === env.BLOG_REPO && cachedToken.expiresAt - Date.now() > 5 * 60_000) {
    return cachedToken.token
  }
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error('GitHub App が設定されていません (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)')
  }
  const jwt = await createAppJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY)
  const installation = await rawRequest<{ id: number }>(jwt, 'Bearer', 'GET', `/repos/${env.BLOG_REPO}/installation`)
  const { token, expires_at } = await rawRequest<{ token: string; expires_at: string }>(
    jwt,
    'Bearer',
    'POST',
    `/app/installations/${installation.id}/access_tokens`,
  )
  cachedToken = { repo: env.BLOG_REPO, token, expiresAt: Date.parse(expires_at) }
  return token
}

export type GitHubRepoClient = {
  repo: string
  request<T>(method: string, path: string, body?: unknown): Promise<T>
}

/** path は `/repos/{owner}/{repo}` からの相対パス（例: `/pulls`） */
export async function createRepoClient(env: Bindings): Promise<GitHubRepoClient> {
  const token = await installationToken(env)
  return {
    repo: env.BLOG_REPO,
    request: (method, path, body) => rawRequest(token, 'token', method, `/repos/${env.BLOG_REPO}${path}`, body),
  }
}

export function isGitHubConfigured(env: Bindings): boolean {
  return !!env.GITHUB_APP_ID && !!env.GITHUB_APP_PRIVATE_KEY
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyWebhookSignature(secret: string, body: string, signature: string | undefined) {
  if (!signature?.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return timingSafeEqual(`sha256=${hex}`, signature)
}
