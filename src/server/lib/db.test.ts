/**
 * ULID + DB helper tests
 */

import { describe, it, expect } from 'vitest'
import { generateULID } from '../lib/db'

describe('generateULID', () => {
  it('generates a 26-character Crockford base32 string', () => {
    const id = generateULID()
    expect(id.length).toBe(26)
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateULID()))
    expect(ids.size).toBe(1000)
  })

  it('time-prefix encodes current timestamp (first 10 chars advance with time)', async () => {
    const id1 = generateULID()
    // Wait 2ms to guarantee a different timestamp
    await new Promise((r) => setTimeout(r, 2))
    const id2 = generateULID()
    // Later-generated ID must sort after earlier one (time prefix dominates)
    expect(id2 > id1).toBe(true)
  })
})
