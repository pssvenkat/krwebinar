#!/usr/bin/env node
/**
 * hash-password.ts — Phase 7 deployment utility
 *
 * Generates a PBKDF2-SHA256 password hash compatible with the platform's
 * auth system. Run with:
 *
 *   npx tsx scripts/hash-password.ts <password>
 *
 * The output is safe to paste directly into SQL seed files.
 */

import { webcrypto } from 'crypto'

const ITERATIONS = 310_000
const KEY_LENGTH = 32
const ALGORITHM = 'SHA-256'

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const saltBytes = webcrypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const hashBuffer = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: ITERATIONS,
      hash: ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH * 8,
  )

  const hashHex = Buffer.from(hashBuffer).toString('hex')
  const saltHex = Buffer.from(saltBytes).toString('hex')

  // Format: pbkdf2:sha256:<iterations>:<saltHex>:<hashHex>
  return `pbkdf2:sha256:${ITERATIONS}:${saltHex}:${hashHex}`
}

const password = process.argv[2]
if (!password) {
  console.error('Usage: npx tsx scripts/hash-password.ts <password>')
  process.exit(1)
}

hashPassword(password).then((hash) => {
  console.warn('\nPassword hash (paste into SQL seed):')
  console.warn(hash)
  console.warn()
}).catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
