/**
 * Password utility — Web Crypto API
 *
 * Uses PBKDF2 with SHA-256, 100,000 iterations, and a 16-byte random salt.
 * Format stored in DB: `pbkdf2:sha256:<iterations>:<salt_hex>:<hash_hex>`
 *
 * Zero npm dependencies. Compatible with Cloudflare Workers.
 */

const ITERATIONS = 100_000
const KEY_LEN = 32      // bytes
const SALT_LEN = 16     // bytes
const ALG: HmacImportParams = { name: 'PBKDF2' }

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr
}

/** Hash a plaintext password. Returns the full stored string. */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = new Uint8Array(SALT_LEN)
  crypto.getRandomValues(salt)

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), ALG, false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LEN * 8,
  )

  return `pbkdf2:sha256:${ITERATIONS}:${bufToHex(salt)}:${bufToHex(derived)}`
}

/** Verify a plaintext password against a stored hash string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false

  const [, , iterStr, saltHex, hashHex] = parts
  const iterations = parseInt(iterStr, 10)
  if (!iterations || !saltHex || !hashHex) return false

  const enc = new TextEncoder()
  const salt = hexToBuf(saltHex)

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), ALG, false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LEN * 8,
  )

  const newHash = bufToHex(derived)

  // Constant-time comparison
  if (newHash.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < newHash.length; i++) {
    diff |= newHash.charCodeAt(i) ^ hashHex.charCodeAt(i)
  }
  return diff === 0
}
