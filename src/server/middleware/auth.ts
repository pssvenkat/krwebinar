/**
 * Auth Middleware
 *
 * Verifies the Bearer JWT access token and populates
 * `c.get('jwtPayload')` for downstream route handlers.
 *
 * Usage:
 *   router.use('/admin/*', requireAuth())
 *   router.use('/admin/*', requireRole(['VENDOR_ADMIN']))
 */

import type { MiddlewareHandler } from 'hono'
import { verifyJWT } from '../lib/jwt'
import type { Env, HonoVariables } from '../types'

/** Require a valid JWT. Sets c.get('jwtPayload'). */
export function requireAuth(): MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> {
  return async (c, next) => {
    const authHeader = c.req.header('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } },
        401,
      )
    }

    const token = authHeader.slice(7)
    const payload = await verifyJWT(token, c.env.JWT_SECRET)

    if (!payload) {
      return c.json(
        { ok: false, error: { code: 'TOKEN_INVALID', message: 'Token is invalid or expired' } },
        401,
      )
    }

    // Ensure the token's tenant matches the resolved tenant (prevents cross-tenant attacks)
    const tenant = c.get('tenant')
    if (tenant && payload.tenantId !== tenant.id) {
      return c.json(
        { ok: false, error: { code: 'TENANT_MISMATCH', message: 'Token tenant does not match request tenant' } },
        403,
      )
    }

    c.set('jwtPayload', payload)
    return next()
  }
}

/** Require one of the given roles. Must be used after requireAuth(). */
export function requireRole(roles: string[]): MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> {
  return async (c, next) => {
    const payload = c.get('jwtPayload')
    if (!payload) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        401,
      )
    }

    if (!roles.includes(payload.role)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: `This action requires one of: ${roles.join(', ')}`,
          },
        },
        403,
      )
    }

    return next()
  }
}
