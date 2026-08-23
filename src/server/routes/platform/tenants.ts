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
  getPlatformGlobalOverview,
  getPlatformAuditLogs,
  getPlatformSecurityIncidents,
  listTenantDomains,
  createTenantDomain,
  getTenantDomainById,
  verifyTenantDomain,
  deleteTenantDomain,
  listAllPlatformDomains,
  setPlatformMetricsReset,
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

// ── POST /metrics/reset — Reset daily quota counters ──────────────
app.post('/metrics/reset', async (c) => {
  const result = setPlatformMetricsReset()
  const overview = await getPlatformGlobalOverview(c.env.DB)
  return c.json({ ok: true, data: { message: 'Daily quota counters reset successfully', ...result, overview } })
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

// ── GET /domains (Platform-wide custom domains & subdomains) ──────

app.get('/domains', async (c) => {
  const domains = await listAllPlatformDomains(c.env.DB)
  return c.json({ ok: true, data: { domains } })
})

// ── GET /tenants/:id/domains ──────────────────────────────────────

app.get('/tenants/:id/domains', async (c) => {
  const id = c.req.param('id')
  const tenant = await getPlatformTenantById(c.env.DB, id)
  if (!tenant) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404)
  }

  const domains = await listTenantDomains(c.env.DB, id)
  return c.json({
    ok: true,
    data: {
      domains,
      instructions: {
        cnameTarget: 'custom.krwebinar.com',
        txtPrefix: '_krwebinar-challenge',
      },
    },
  })
})

// ── POST /tenants/:id/domains ─────────────────────────────────────

const createPlatformDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(
      /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/,
      'Must be a valid fully qualified domain or subdomain (e.g. webinar.mybrand.com or tenant.krwebinar.com)',
    ),
})

app.post('/tenants/:id/domains', zValidator('json', createPlatformDomainSchema), async (c) => {
  const id = c.req.param('id')
  const tenant = await getPlatformTenantById(c.env.DB, id)
  if (!tenant) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404)
  }

  const { domain } = c.req.valid('json')
  const normalized = domain.toLowerCase().trim()

  // Check if domain already exists for this tenant
  const existing = await listTenantDomains(c.env.DB, id)
  if (existing.some((d) => d.domain === normalized)) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'DOMAIN_EXISTS',
          message: `Domain "${normalized}" is already assigned to this tenant.`,
        },
      },
      409,
    )
  }

  const created = await createTenantDomain(c.env.DB, id, normalized)
  return c.json({ ok: true, data: { domain: created } }, 201)
})

// ── POST /tenants/:id/domains/:domainId/verify ────────────────────

app.post('/tenants/:id/domains/:domainId/verify', async (c) => {
  const id = c.req.param('id')
  const domainId = c.req.param('domainId')

  const tenant = await getPlatformTenantById(c.env.DB, id)
  if (!tenant) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404)
  }

  const domain = await getTenantDomainById(c.env.DB, id, domainId)
  if (!domain) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Domain mapping not found' } }, 404)
  }

  const result = await verifyTenantDomain(c.env.DB, id, domainId)
  return c.json({ ok: true, data: result })
})

// ── DELETE /tenants/:id/domains/:domainId ─────────────────────────

app.delete('/tenants/:id/domains/:domainId', async (c) => {
  const id = c.req.param('id')
  const domainId = c.req.param('domainId')

  const tenant = await getPlatformTenantById(c.env.DB, id)
  if (!tenant) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404)
  }

  const domain = await getTenantDomainById(c.env.DB, id, domainId)
  if (!domain) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Domain mapping not found' } }, 404)
  }

  const deleted = await deleteTenantDomain(c.env.DB, id, domainId)
  return c.json({ ok: true, data: { deleted } })
})

export { app as platformRoutes }
