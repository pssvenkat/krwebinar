/**
 * JWT utility — Web Crypto API
 *
 * Uses the native Web Crypto API (available in Cloudflare Workers, browsers,
 * and Node 18+). Zero npm dependencies.
 *
 * Algorithm: HMAC-SHA256 (HS256)
 * Format: standard JWT (base64url header.payload.signature)
 */

import type { JWTPayload } from '../types'

const ALG = { name: 'HMAC', hash: 'SHA-256' } as const

/** Import the raw secret string as a CryptoKey */
async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey('raw', enc.encode(secret), ALG, false, ['sign', 'verify'])
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  return atob(padded)
}

/** Sign and return a JWT access token (15 min default) */
export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds = 60 * 15, // 15 minutes
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: JWTPayload = { ...payload, iat: now, exp: now + expiresInSeconds }

  const enc = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${headerB64}.${payloadB64}`

  const key = await importKey(secret)
  const sig = await crypto.subtle.sign(ALG, key, enc.encode(signingInput))

  return `${signingInput}.${base64url(sig)}`
}

/** Verify a JWT and return its payload, or null if invalid/expired */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, sigB64] = parts
  const signingInput = `${headerB64}.${payloadB64}`

  try {
    const enc = new TextEncoder()
    const key = await importKey(secret)

    // Decode signature
    const sigStr = base64urlDecode(sigB64)
    const sigBytes = new Uint8Array(sigStr.length)
    for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i)

    const valid = await crypto.subtle.verify(ALG, key, sigBytes, enc.encode(signingInput))
    if (!valid) return null

    // Decode payload
    const payloadStr = base64urlDecode(payloadB64)
    const payload = JSON.parse(payloadStr) as JWTPayload

    // Check expiry
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

/** Generate a cryptographically random token (for refresh tokens, access tokens) */
export function generateSecureToken(bytes = 32): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** SHA-256 hash of a raw token string (for storage) */
export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(token))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
