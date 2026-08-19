/**
 * Rate Limiting Middleware — Phase 13 Production Hardening
 *
 * Sliding-window in-memory rate limiter running at edge.
 * Keyed by client IP (cf-connecting-ip / x-forwarded-for) + endpoint key.
 * Emits standard rate limit headers (RFC 6585 & Draft RFC 7).
 */

import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types'

interface RateLimitConfig {
  windowSeconds: number
  max: number
  keyPrefix?: string
  message?: string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store per worker instance (cleared upon worker restart / garbage collection)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Periodic cleanup of expired keys (every 2 minutes)
let lastCleanup = Date.now()
function cleanupExpired(now: number) {
  if (now - lastCleanup < 120_000) return
  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

export function rateLimiter(config: RateLimitConfig): MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> {
  const {
    windowSeconds = 60,
    max = 60,
    keyPrefix = 'rl',
    message = 'Too many requests, please try again later.',
  } = config

  return async (c, next) => {
    const now = Date.now()
    cleanupExpired(now)

    // Extract client IP with fallback
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1'

    const key = `${keyPrefix}:${ip}`
    const windowMs = windowSeconds * 1000

    let entry = rateLimitStore.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs }
      rateLimitStore.set(key, entry)
    } else {
      entry.count += 1
    }

    const remaining = Math.max(0, max - entry.count)
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000)

    // Set standard headers
    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header('X-RateLimit-Reset', String(resetSeconds))

    if (entry.count > max) {
      c.header('Retry-After', String(resetSeconds))
      return c.json(
        {
          ok: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message,
            retryAfterSeconds: resetSeconds,
          },
        },
        429,
      )
    }

    return next()
  }
}

/** Pre-configured rate limiter for authentication endpoints (10 attempts / minute) */
export const authRateLimiter = rateLimiter({
  windowSeconds: 60,
  max: 10,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please wait a minute before trying again.',
})

/** Pre-configured rate limiter for public webinar registration (20 registrations / minute per IP) */
export const registrationRateLimiter = rateLimiter({
  windowSeconds: 60,
  max: 20,
  keyPrefix: 'reg',
  message: 'Registration rate limit exceeded. Please try again in a few moments.',
})

/** Pre-configured rate limiter for DNS verification attempts (10 checks / 5 minutes) */
export const domainVerifyRateLimiter = rateLimiter({
  windowSeconds: 300,
  max: 10,
  keyPrefix: 'dns_verify',
  message: 'DNS verification rate limit reached. Please wait before retrying.',
})

/** Reset store for testing */
export function _resetRateLimitStore() {
  rateLimitStore.clear()
}
