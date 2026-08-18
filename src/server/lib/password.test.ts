/**
 * Password utility tests
 */

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../lib/password'

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(hash).toMatch(/^pbkdf2:sha256:/)
    const valid = await verifyPassword('correct-horse-battery-staple', hash)
    expect(valid).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('secret123')
    const valid = await verifyPassword('wrong-password', hash)
    expect(valid).toBe(false)
  })

  it('produces different hashes for same password (salted)', async () => {
    const h1 = await hashPassword('samepassword')
    const h2 = await hashPassword('samepassword')
    expect(h1).not.toBe(h2)
  })

  it('returns false for a malformed hash', async () => {
    expect(await verifyPassword('pass', 'not-a-valid-hash')).toBe(false)
    expect(await verifyPassword('pass', '')).toBe(false)
    expect(await verifyPassword('pass', 'pbkdf2:sha256:x:y')).toBe(false)
  })
})
