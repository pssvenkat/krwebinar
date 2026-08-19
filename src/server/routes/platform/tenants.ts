/**
 * Platform admin routes — Phase 12
 *
 * All routes require PLATFORM_OWNER role.
 * These are mounted at /api/platform (no tenant middleware).
 *
 * GET  /api/platform/tenants          → list all tenants
 * POST /api/platform/tenants          → create new tenant
 * GET  /api/platform/tenants/:id      → get tenant + stats
 * PUT  /api/platform/tenants/:id      → update status
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, HonoVariables } from '../../types'
import { requireAuth, requireRole } from '../../middleware/auth'
import {
  listPlatformTenants,
  createPlatformTenant,
  getPlatformTenantById,
  updatePlatformTenantStatus,
  getPlatformTenantStats,
} from '../../lib/db'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// ── Require PLATFORM_OWNER on all routes ──────────────────────────
app.use('*', requireAuth())
app.use('*', requireRole(['PLATFORM_OWNER']))

// ── GET /tenants ──────────────────────────────────────────────────

app.get('/tenants', async (c) => {
  const tenants = await listPlatformTenants(c.env.DB)
  return c.json({ ok: true, data: { tenants } })
})

// ── POST /tenants ─────────────────────────────────────────────────

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens only'),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('free'),
})

app.post('/tenants', zValidator('json', createTenantSchema), async (c) => {
  const data = c.req.valid('json')

  // Check slug uniqueness
  const existing = await listPlatformTenants(c.env.DB)
  if (existing.some((t) => t.slug === data.slug)) {
    return c.json(
      { ok: false, error: { code: 'SLUG_TAKEN', message: `Slug "${data.slug}" is already in use` } },
      409,
    )
  }

  const tenant = await createPlatformTenant(c.env.DB, {
    name: data.name,
    slug: data.slug,
    plan: data.plan,
  })

  return c.json({ ok: true, data: { tenant } }, 201)
})

// ── GET /tenants/:id ──────────────────────────────────────────────

app.get('/tenants/:id', async (c) => {
  const id = c.req.param('id')
  const [tenant, stats] = await Promise.all([
    getPlatformTenantById(c.env.DB, id),
    getPlatformTenantStats(c.env.DB, id),
  ])
  if (!tenant) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404)
  }
  return c.json({ ok: true, data: { tenant, stats } })
})

// ── PUT /tenants/:id ──────────────────────────────────────────────

const updateTenantSchema = z.object({
  status: z.enum(['trial', 'active', 'suspended']),
})

app.put('/tenants/:id', zValidator('json', updateTenantSchema), async (c) => {
  const id = c.req.param('id')
  const { status } = c.req.valid('json')

  const tenant = await getPlatformTenantById(c.env.DB, id)
  if (!tenant) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404)
  }

  const updated = await updatePlatformTenantStatus(c.env.DB, id, status)
  return c.json({ ok: true, data: { tenant: updated } })
})

// ── GET /metrics (Module 1 & 2: Free-Tier Quota & Global Metrics) ─

app.get('/metrics', async (c) => {
  const overview = await getPlatformGlobalOverview(c.env.DB)
  return c.json({ ok: true, data: overview })
})

// ── GET /audit-logs (Module 4: DPDP Masked Audit Trail) ───────────

app.get('/audit-logs', async (c) => {
  const logs = getPlatformAuditLogs()
  return c.json({ ok: true, data: { logs } })
})

// ── GET /security-incidents (Module 5: Security Posture) ───────────

app.get('/security-incidents', async (c) => {
  const incidents = getPlatformSecurityIncidents()
  return c.json({ ok: true, data: { incidents } })
})

// ── PUT /security-incidents/:id/status ────────────────────────────

app.put('/security-incidents/:id/status', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json()) as { status: string }
  return c.json({ ok: true, data: { id, status: body.status, updated_at: new Date().toISOString() } })
})

export { app as platformRoutes }
