import { Hono } from 'hono'
import { APP_VERSION } from '../../shared/constants'
import type { Env } from '../types'
import type { HealthResponse } from '../../shared/types'

export const healthRouter = new Hono<{ Bindings: Env }>()

/**
 * GET /api/health
 *
 * Returns platform health status.
 * Used by uptime monitors, deployment verification, and the admin UI.
 */
healthRouter.get('/health', (c) => {
  const response: HealthResponse = {
    status: 'ok',
    version: APP_VERSION,
    environment: c.env.ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
  }
  return c.json({ ok: true, data: response })
})
