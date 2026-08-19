import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { healthRouter } from './routes/health'
import { tenantRoutes } from './routes/tenant'
import { authRoutes } from './routes/auth'
import { webinarAdminRoutes } from './routes/admin/webinars'
import { registrationAdminRoutes } from './routes/admin/registrations'
import { analyticsRoutes } from './routes/admin/analytics'
import { brandingRoutes } from './routes/admin/branding'
import { leadsRoutes } from './routes/admin/leads'
import { domainRoutes } from './routes/admin/domains'
import { adminUserRoutes } from './routes/admin/users'
import { platformRoutes } from './routes/platform/tenants'
import { platformUserRoutes } from './routes/platform/users'
import { publicWebinarRoutes } from './routes/public/webinar'
import { unsubscribeRoutes } from './routes/public/unsubscribe'
import { wsRoutes } from './routes/attend/ws'
import { tenantMiddleware } from './middleware/tenant'
import { authRateLimiter, registrationRateLimiter } from './middleware/rate-limit'
import { scheduled } from './scheduler'
import type { Env, HonoVariables } from './types'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// ─────────────────────────────────────────────────────────────────
// Global middleware
// ─────────────────────────────────────────────────────────────────

app.use('*', logger())
app.use('*', secureHeaders())

// Static asset caching for CDN / browser performance (immutable hashed assets)
app.use('/assets/*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'public, max-age=31536000, immutable')
})

// CORS
app.use('/api/*', async (c, next) => {
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
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Slug')
    c.header('Access-Control-Allow-Credentials', 'true')
  }

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }

  return next()
})

// Tenant resolution — runs for all /api/v1/* routes
app.use('/api/v1/*', tenantMiddleware())

// ─────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────

// Platform-level (no tenant required)
app.route('/api', healthRouter)

// Tenant-scoped v1 API
app.use('/api/v1/auth/login', authRateLimiter)
app.use('/api/v1/webinars/*/register', registrationRateLimiter)

app.route('/api/v1/tenant', tenantRoutes)
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/admin/webinars', webinarAdminRoutes)
app.route('/api/v1/admin/webinars', registrationAdminRoutes)
app.route('/api/v1/admin', analyticsRoutes)
app.route('/api/v1/admin', brandingRoutes)
app.route('/api/v1', brandingRoutes)    // serves /api/v1/public/branding (no auth)
app.route('/api/v1/admin', leadsRoutes)
app.route('/api/v1/admin/domains', domainRoutes)
app.route('/api/v1/admin/users', adminUserRoutes)

// Platform admin (PLATFORM_OWNER only — no tenant middleware)
app.route('/api/platform', platformRoutes)
app.route('/api/platform/users', platformUserRoutes)

// Public routes (no auth — tenant-scoped only)
app.route('/api/v1/webinars', publicWebinarRoutes)
app.route('/api/v1', publicWebinarRoutes)

// WebSocket routes (tenant-scoped — attendee token or JWT validated inside)
app.route('/api/v1/ws/webinar', wsRoutes)

// Unsubscribe (no auth, no tenant — keyed by access_token)
app.route('/api/v1/unsubscribe', unsubscribeRoutes)

// 404 handler for unmatched API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
  }
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
// Exports: Durable Objects + Cron handler
// ─────────────────────────────────────────────────────────────────

export { WebinarRoom } from '../durable-objects/WebinarRoom'
export { scheduled }

export default app
