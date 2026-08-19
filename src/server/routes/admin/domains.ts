/**
 * Custom Domain Admin Routes — Phase 13
 *
 * GET    /api/v1/admin/domains            → list domains for current tenant
 * POST   /api/v1/admin/domains            → add a new custom domain
 * POST   /api/v1/admin/domains/:id/verify → trigger DNS verification
 * DELETE /api/v1/admin/domains/:id        → remove custom domain
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, HonoVariables } from '../../types'
import { requireAuth } from '../../middleware/auth'
import { domainVerifyRateLimiter } from '../../middleware/rate-limit'
import {
  listTenantDomains,
  createTenantDomain,
  getTenantDomainById,
  verifyTenantDomain,
  deleteTenantDomain,
} from '../../lib/db'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// All routes require vendor admin authentication
app.use('*', requireAuth())

// ── GET / ──────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const tenant = c.get('tenant')
  const domains = await listTenantDomains(c.env.DB, tenant.id)
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

// ── POST / ─────────────────────────────────────────────────────────

const createDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(
      /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/,
      'Must be a valid fully qualified domain name (e.g. webinar.mybrand.com)',
    ),
})

app.post('/', zValidator('json', createDomainSchema), async (c) => {
  const tenant = c.get('tenant')
  const { domain } = c.req.valid('json')
  const normalized = domain.toLowerCase().trim()

  const platformDomain = c.env.PLATFORM_DOMAIN || 'krwebinar.com'
  if (normalized === platformDomain || normalized.endsWith(`.${platformDomain}`)) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'INVALID_DOMAIN',
          message: 'Cannot add platform domain as a custom domain.',
        },
      },
      400,
    )
  }

  // Check if domain already exists for this tenant
  const existing = await listTenantDomains(c.env.DB, tenant.id)
  if (existing.some((d) => d.domain === normalized)) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'DOMAIN_EXISTS',
          message: `Domain "${normalized}" is already mapped to your account.`,
        },
      },
      409,
    )
  }

  const created = await createTenantDomain(c.env.DB, tenant.id, normalized)
  return c.json({ ok: true, data: { domain: created } }, 201)
})

// ── POST /:id/verify ──────────────────────────────────────────────

app.post('/:id/verify', domainVerifyRateLimiter, async (c) => {
  const tenant = c.get('tenant')
  const domainId = c.req.param('id')

  const domain = await getTenantDomainById(c.env.DB, tenant.id, domainId)
  if (!domain) {
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Domain mapping not found.' } },
      404,
    )
  }

  const result = await verifyTenantDomain(c.env.DB, tenant.id, domainId)
  return c.json({ ok: true, data: result })
})

// ── DELETE /:id ───────────────────────────────────────────────────

app.delete('/:id', async (c) => {
  const tenant = c.get('tenant')
  const domainId = c.req.param('id')

  const domain = await getTenantDomainById(c.env.DB, tenant.id, domainId)
  if (!domain) {
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Domain mapping not found.' } },
      404,
    )
  }

  await deleteTenantDomain(c.env.DB, tenant.id, domainId)
  return c.json({ ok: true, data: { deleted: true, id: domainId } })
})

export { app as domainRoutes }
