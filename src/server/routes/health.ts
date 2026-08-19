import { Hono } from 'hono'
import { APP_VERSION } from '../../shared/constants'
import type { Env } from '../types'
import type { HealthResponse } from '../../shared/types'

export const healthRouter = new Hono<{ Bindings: Env }>()

/**
 * GET /api/health
 *
 * Returns platform liveness status.
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

/**
 * GET /api/health/ready
 *
 * Deep readiness check that validates D1 database connectivity and query response time.
 * Returns 200 when ready, 503 if dependencies fail.
 */
healthRouter.get('/health/ready', async (c) => {
  const startTime = Date.now()
  let dbStatus: 'pass' | 'fail' = 'pass'
  let dbLatencyMs = 0
  let dbError: string | null = null

  try {
    const pingStart = Date.now()
    await c.env.DB.prepare('SELECT 1 as ping').first()
    dbLatencyMs = Date.now() - pingStart
  } catch (err) {
    dbStatus = 'fail'
    dbError = err instanceof Error ? err.message : 'Database ping failed'
  }

  const isReady = dbStatus === 'pass'
  const totalLatencyMs = Date.now() - startTime

  const response = {
    status: isReady ? 'ready' : 'unhealthy',
    version: APP_VERSION,
    environment: c.env.ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
    latencyMs: totalLatencyMs,
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      worker: {
        status: 'pass',
      },
    },
  }

  return c.json(
    { ok: isReady, data: response },
    isReady ? 200 : 503,
  )
})
