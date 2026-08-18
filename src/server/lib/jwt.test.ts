/**
 * JWT utility tests
 *
 * Run in Node 18+ via Vitest (Web Crypto API is available natively).
 */

import { describe, it, expect } from 'vitest'
import { signJWT, verifyJWT, generateSecureToken, hashToken } from '../lib/jwt'

const SECRET = 'test-secret-for-unit-tests-only'

describe('signJWT / verifyJWT', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signJWT(
      { sub: 'user-1', tenantId: 'tenant-1', role: 'VENDOR_ADMIN', email: 'admin@test.com' },
      SECRET,
    )
    expect(token.split('.').length).toBe(3)

    const payload = await verifyJWT(token, SECRET)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('user-1')
    expect(payload!.tenantId).toBe('tenant-1')
    expect(payload!.role).toBe('VENDOR_ADMIN')
    expect(payload!.email).toBe('admin@test.com')
  })

  it('returns null for a tampered token', async () => {
    const token = await signJWT(
      { sub: 'user-1', tenantId: 'tenant-1', role: 'VENDOR_ADMIN', email: 'x@test.com' },
      SECRET,
    )
    const parts = token.split('.')
    // Tamper with the payload
    const tamperedPayload = btoa(JSON.stringify({ sub: 'evil-user', tenantId: 'other', role: 'PLATFORM_OWNER', email: 'hack@test.com', iat: 0, exp: 9999999999 }))
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`
    const result = await verifyJWT(tamperedToken, SECRET)
    expect(result).toBeNull()
  })

  it('returns null for wrong secret', async () => {
    const token = await signJWT(
      { sub: 'u1', tenantId: 't1', role: 'VENDOR_ADMIN', email: 'x@test.com' },
      SECRET,
    )
    const result = await verifyJWT(token, 'wrong-secret')
    expect(result).toBeNull()
  })

  it('returns null for expired token', async () => {
    const token = await signJWT(
      { sub: 'u1', tenantId: 't1', role: 'VENDOR_ADMIN', email: 'x@test.com' },
      SECRET,
      -1, // already expired
    )
    const result = await verifyJWT(token, SECRET)
    expect(result).toBeNull()
  })

  it('returns null for malformed token', async () => {
    expect(await verifyJWT('not.a.jwt', SECRET)).toBeNull()
    expect(await verifyJWT('', SECRET)).toBeNull()
    expect(await verifyJWT('onlytwoparts.here', SECRET)).toBeNull()
  })

  it('includes iat and exp in payload', async () => {
    const before = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { sub: 'u1', tenantId: 't1', role: 'VENDOR_ADMIN', email: 'x@test.com' },
      SECRET,
      300,
    )
    const payload = await verifyJWT(token, SECRET)
    const after = Math.floor(Date.now() / 1000)

    expect(payload!.iat).toBeGreaterThanOrEqual(before)
    expect(payload!.iat).toBeLessThanOrEqual(after)
    expect(payload!.exp).toBeCloseTo(payload!.iat + 300, -1)
  })
})

describe('generateSecureToken', () => {
  it('generates a hex string of correct length', () => {
    const token = generateSecureToken(32)
    expect(token).toMatch(/^[0-9a-f]+$/)
    expect(token.length).toBe(64) // 32 bytes = 64 hex chars
  })

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()))
    expect(tokens.size).toBe(100)
  })
})

describe('hashToken', () => {
  it('produces consistent SHA-256 hash', async () => {
    const token = 'test-token-value'
    const h1 = await hashToken(token)
    const h2 = await hashToken(token)
    expect(h1).toBe(h2)
    expect(h1.length).toBe(64) // SHA-256 = 32 bytes = 64 hex chars
  })

  it('different inputs produce different hashes', async () => {
    const h1 = await hashToken('token-a')
    const h2 = await hashToken('token-b')
    expect(h1).not.toBe(h2)
  })
})
