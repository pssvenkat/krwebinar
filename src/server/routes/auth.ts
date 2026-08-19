/**
 * Auth Routes
 *
 * POST /api/v1/auth/login     — email + password → access token + refresh token
 * POST /api/v1/auth/refresh   — rotate refresh token → new access token
 * POST /api/v1/auth/logout    — revoke current refresh token
 * GET  /api/v1/auth/me        — current user profile (requires auth)
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { signJWT, generateSecureToken, hashToken } from '../lib/jwt'
import { verifyPassword } from '../lib/password'
import { findUserByEmail, findUserById, storeRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../lib/db'
import { requireAuth } from '../middleware/auth'
import type { Env, HonoVariables } from '../types'

export const authRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

const REFRESH_COOKIE = 'rt'
const REFRESH_TTL_DAYS = 7
const ACCESS_TTL_SECONDS = 60 * 15 // 15 minutes

// ── POST /login ───────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const tenant = c.get('tenant')
  const db = c.env.DB

  // Look up user scoped to this tenant, or check for platform owner
  let user = await findUserByEmail(db, tenant.id, email)
  if (!user) {
    user = await findUserByEmail(db, null, email)
  }

  if (!user) {
    // Timing-safe: always run a hash check even on miss
    await verifyPassword(password, 'pbkdf2:sha256:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000')
    return c.json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401)
  }

  // Issue access token
  const accessToken = await signJWT(
    { sub: user.id, tenantId: user.tenant_id, role: user.role, email: user.email },
    c.env.JWT_SECRET,
    ACCESS_TTL_SECONDS,
  )

  // Issue refresh token
  const rawRefresh = generateSecureToken(48)
  const refreshHash = await hashToken(rawRefresh)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000)
  await storeRefreshToken(db, user.id, user.tenant_id, refreshHash, expiresAt)

  // Store refresh token in httpOnly cookie
  c.header(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${rawRefresh}; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=${REFRESH_TTL_DAYS * 86400}`,
  )

  return c.json({
    ok: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      expiresIn: ACCESS_TTL_SECONDS,
    },
  })
})

// ── POST /refresh ─────────────────────────────────────────────────

authRoutes.post('/refresh', async (c) => {
  const cookieHeader = c.req.header('cookie') ?? ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((p) => {
      const [k, ...v] = p.trim().split('=')
      return [k.trim(), v.join('=').trim()]
    }),
  )
  const rawRefresh = cookies[REFRESH_COOKIE]

  if (!rawRefresh) {
    return c.json({ ok: false, error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token' } }, 401)
  }

  const tokenHash = await hashToken(rawRefresh)
  const record = await verifyRefreshToken(c.env.DB, tokenHash)

  if (!record) {
    return c.json({ ok: false, error: { code: 'REFRESH_INVALID', message: 'Refresh token invalid or expired' } }, 401)
  }

  // Rotate: revoke old, issue new
  await revokeRefreshToken(c.env.DB, tokenHash)

  const user = await findUserById(c.env.DB, record.userId)
  if (!user) {
    return c.json({ ok: false, error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' } }, 401)
  }

  const accessToken = await signJWT(
    { sub: user.id, tenantId: user.tenant_id, role: user.role, email: user.email },
    c.env.JWT_SECRET,
    ACCESS_TTL_SECONDS,
  )

  const newRaw = generateSecureToken(48)
  const newHash = await hashToken(newRaw)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000)
  await storeRefreshToken(c.env.DB, user.id, user.tenant_id, newHash, expiresAt)

  c.header(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${newRaw}; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=${REFRESH_TTL_DAYS * 86400}`,
  )

  return c.json({ ok: true, data: { accessToken, expiresIn: ACCESS_TTL_SECONDS } })
})

// ── POST /logout ──────────────────────────────────────────────────

authRoutes.post('/logout', async (c) => {
  const cookieHeader = c.req.header('cookie') ?? ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((p) => {
      const [k, ...v] = p.trim().split('=')
      return [k.trim(), v.join('=').trim()]
    }),
  )
  const rawRefresh = cookies[REFRESH_COOKIE]

  if (rawRefresh) {
    const tokenHash = await hashToken(rawRefresh)
    await revokeRefreshToken(c.env.DB, tokenHash)
  }

  c.header('Set-Cookie', `${REFRESH_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0`)
  return c.json({ ok: true, data: { message: 'Logged out' } })
})

// ── GET /me ───────────────────────────────────────────────────────

authRoutes.get('/me', requireAuth(), async (c) => {
  const payload = c.get('jwtPayload')!
  const user = await findUserById(c.env.DB, payload.sub)

  if (!user) {
    return c.json({ ok: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404)
  }

  return c.json({
    ok: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLoginAt: user.last_login_at,
      },
    },
  })
})
