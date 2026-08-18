import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { healthRouter } from './routes/health'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// ─────────────────────────────────────────────────────────────────
// Global middleware
// ─────────────────────────────────────────────────────────────────

app.use('*', logger())
app.use('*', secureHeaders())
app.use('/api/*', async (c, next) => {
  // CORS — restrict to known origins in production
  const origin = c.req.header('origin') ?? ''
  const env = c.env.ENVIRONMENT ?? 'development'
  const isAllowed =
    env === 'development' ||
    origin.endsWith('.krwebinar.com') ||
    origin.endsWith('.kravemicrogreens.in') ||
    origin === 'https://krwebinar.com'

  if (isAllowed || env === 'development') {
    c.header('Access-Control-Allow-Origin', origin || '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    c.header('Access-Control-Allow-Credentials', 'true')
  }

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }

  return next()
})

// ─────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────

app.route('/api', healthRouter)

// 404 handler for unmatched API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
  }
  // Let non-API routes fall through to the static asset handler
  return c.notFound()
})

// Global error handler
app.onError((err, c) => {
  console.error('[Worker Error]', err)
  return c.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          c.env.ENVIRONMENT === 'development' ? err.message : 'An unexpected error occurred',
      },
    },
    500,
  )
})

// ─────────────────────────────────────────────────────────────────
// Durable Object exports
// ─────────────────────────────────────────────────────────────────

export { WebinarRoom } from '../durable-objects/WebinarRoom'

export default app
