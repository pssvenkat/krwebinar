/**
 * Domain routes unit tests — Phase 13
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@hono/zod-validator', () => ({
  zValidator: (_target: string, _schema: unknown) =>
    async (
      c: { req: { json: () => Promise<unknown>; addValidatedData: (t: string, d: unknown) => void } },
      next: () => Promise<void>,
    ) => {
      const body = await c.req.json()
      c.req.addValidatedData('json', body)
      await next()
    },
}))

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}))

// ── Mock DB ───────────────────────────────────────────────────────

const mockListTenantDomains = vi.fn()
const mockCreateTenantDomain = vi.fn()
const mockGetTenantDomainById = vi.fn()
const mockVerifyTenantDomain = vi.fn()
const mockDeleteTenantDomain = vi.fn()

vi.mock('../../lib/db', () => ({
  listTenantDomains: (...a: unknown[]) => mockListTenantDomains(...a),
  createTenantDomain: (...a: unknown[]) => mockCreateTenantDomain(...a),
  getTenantDomainById: (...a: unknown[]) => mockGetTenantDomainById(...a),
  verifyTenantDomain: (...a: unknown[]) => mockVerifyTenantDomain(...a),
  deleteTenantDomain: (...a: unknown[]) => mockDeleteTenantDomain(...a),
}))

// ── Fixtures ──────────────────────────────────────────────────────

const MOCK_TENANT = { id: 'tenant-1', name: 'Krave', slug: 'krave' }
const MOCK_DOMAIN = {
  id: 'dom-1',
  tenant_id: 'tenant-1',
  domain: 'webinar.kravemicrogreens.in',
  status: 'pending',
  ssl_status: 'pending',
  verification_token: 'krwebinar-verify-abc123',
  cname_target: 'custom.krwebinar.com',
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
}

const MOCK_ENV = { DB: {}, PLATFORM_DOMAIN: 'krwebinar.com' }

async function buildApp() {
  const { domainRoutes } = await import('./domains')
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('tenant', MOCK_TENANT)
    await next()
  })
  app.route('/api/v1/admin/domains', domainRoutes)
  return app
}

describe('Admin Custom Domains API', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    mockListTenantDomains.mockResolvedValue([MOCK_DOMAIN])
    mockCreateTenantDomain.mockResolvedValue(MOCK_DOMAIN)
    mockGetTenantDomainById.mockResolvedValue(MOCK_DOMAIN)
    mockVerifyTenantDomain.mockResolvedValue({
      verified: true,
      domain: { ...MOCK_DOMAIN, status: 'active', ssl_status: 'active' },
    })
    mockDeleteTenantDomain.mockResolvedValue(true)
    app = await buildApp()
  })

  it('GET /api/v1/admin/domains returns domain list and DNS instructions', async () => {
    const res = await app.fetch(new Request('http://localhost/api/v1/admin/domains'), MOCK_ENV)
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      ok: boolean
      data: { domains: typeof MOCK_DOMAIN[]; instructions: { cnameTarget: string } }
    }
    expect(json.ok).toBe(true)
    expect(json.data.domains).toHaveLength(1)
    expect(json.data.domains[0].domain).toBe('webinar.kravemicrogreens.in')
    expect(json.data.instructions.cnameTarget).toBe('custom.krwebinar.com')
  })

  it('POST /api/v1/admin/domains maps a new custom domain', async () => {
    mockListTenantDomains.mockResolvedValueOnce([]) // no duplicates
    const res = await app.fetch(
      new Request('http://localhost/api/v1/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'live.mybrand.org' }),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(201)
    expect(mockCreateTenantDomain).toHaveBeenCalledWith(MOCK_ENV.DB, 'tenant-1', 'live.mybrand.org')
  })

  it('POST /api/v1/admin/domains prevents platform domain collision', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/v1/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'app.krwebinar.com' }),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(400)
    const json = (await res.json()) as { ok: boolean; error: { code: string } }
    expect(json.ok).toBe(false)
    expect(json.error.code).toBe('INVALID_DOMAIN')
  })

  it('POST /api/v1/admin/domains/:id/verify triggers domain verification', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/v1/admin/domains/dom-1/verify', {
        method: 'POST',
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      ok: boolean
      data: { verified: boolean; domain: { status: string } }
    }
    expect(json.ok).toBe(true)
    expect(json.data.verified).toBe(true)
    expect(json.data.domain.status).toBe('active')
  })

  it('DELETE /api/v1/admin/domains/:id removes custom domain', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/v1/admin/domains/dom-1', {
        method: 'DELETE',
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(200)
    expect(mockDeleteTenantDomain).toHaveBeenCalledWith(MOCK_ENV.DB, 'tenant-1', 'dom-1')
  })
})
