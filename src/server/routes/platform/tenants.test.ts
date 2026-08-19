/**
 * Platform tenant route tests — Phase 12
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
  requireRole: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}))

// ── Mock DB ───────────────────────────────────────────────────────

const mockListPlatformTenants    = vi.fn()
const mockCreatePlatformTenant   = vi.fn()
const mockGetPlatformTenantById  = vi.fn()
const mockUpdatePlatformTenantStatus = vi.fn()
const mockGetPlatformTenantStats = vi.fn()

vi.mock('../../lib/db', () => ({
  listPlatformTenants:          (...a: unknown[]) => mockListPlatformTenants(...a),
  createPlatformTenant:         (...a: unknown[]) => mockCreatePlatformTenant(...a),
  getPlatformTenantById:        (...a: unknown[]) => mockGetPlatformTenantById(...a),
  updatePlatformTenantStatus:   (...a: unknown[]) => mockUpdatePlatformTenantStatus(...a),
  getPlatformTenantStats:       (...a: unknown[]) => mockGetPlatformTenantStats(...a),
}))

// ── Fixtures ──────────────────────────────────────────────────────

const MOCK_TENANT = {
  id: 'tenant-1', slug: 'acme', name: 'Acme Corp',
  status: 'trial', plan: 'free',
  created_at: '2025-01-01T00:00:00', updated_at: '2025-01-01T00:00:00',
}

const MOCK_STATS = { webinarCount: 3, registrationCount: 47, leadCount: 12 }
const MOCK_ENV = { DB: {} }

async function buildApp() {
  const { platformRoutes } = await import('./tenants')
  const app = new Hono()
  app.route('/api/platform', platformRoutes)
  return app
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Platform tenant routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    mockListPlatformTenants.mockResolvedValue([MOCK_TENANT])
    mockCreatePlatformTenant.mockResolvedValue(MOCK_TENANT)
    mockGetPlatformTenantById.mockResolvedValue(MOCK_TENANT)
    mockUpdatePlatformTenantStatus.mockResolvedValue({ ...MOCK_TENANT, status: 'active' })
    mockGetPlatformTenantStats.mockResolvedValue(MOCK_STATS)
    app = await buildApp()
  })

  // ── GET /tenants ─────────────────────────────────────────────

  it('GET /api/platform/tenants returns list', async () => {
    const res = await app.fetch(new Request('http://localhost/api/platform/tenants'), MOCK_ENV)
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: { tenants: typeof MOCK_TENANT[] } }
    expect(json.ok).toBe(true)
    expect(json.data.tenants).toHaveLength(1)
    expect(json.data.tenants[0].slug).toBe('acme')
  })

  // ── POST /tenants — success ───────────────────────────────────

  it('POST /api/platform/tenants creates tenant', async () => {
    // Slug not in existing list — mock returns [] for uniqueness check
    mockListPlatformTenants.mockResolvedValueOnce([])
    const res = await app.fetch(
      new Request('http://localhost/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme Corp', slug: 'acme', plan: 'free' }),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(201)
    const json = await res.json() as { ok: boolean; data: { tenant: typeof MOCK_TENANT } }
    expect(json.ok).toBe(true)
    expect(json.data.tenant.name).toBe('Acme Corp')
    expect(mockCreatePlatformTenant).toHaveBeenCalledWith(MOCK_ENV.DB, expect.objectContaining({ slug: 'acme' }))
  })

  // ── POST /tenants — duplicate slug ────────────────────────────

  it('POST /api/platform/tenants returns 409 for duplicate slug', async () => {
    // mockListPlatformTenants returns [MOCK_TENANT] (slug 'acme' taken)
    const res = await app.fetch(
      new Request('http://localhost/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme 2', slug: 'acme', plan: 'free' }),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(409)
    const json = await res.json() as { ok: boolean; error: { code: string } }
    expect(json.ok).toBe(false)
    expect(json.error.code).toBe('SLUG_TAKEN')
  })

  // ── GET /tenants/:id ─────────────────────────────────────────

  it('GET /api/platform/tenants/:id returns tenant + stats', async () => {
    const res = await app.fetch(new Request('http://localhost/api/platform/tenants/tenant-1'), MOCK_ENV)
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: { tenant: typeof MOCK_TENANT; stats: typeof MOCK_STATS } }
    expect(json.ok).toBe(true)
    expect(json.data.tenant.id).toBe('tenant-1')
    expect(json.data.stats.webinarCount).toBe(3)
  })

  // ── PUT /tenants/:id ─────────────────────────────────────────

  it('PUT /api/platform/tenants/:id updates status', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/platform/tenants/tenant-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: { tenant: { status: string } } }
    expect(json.ok).toBe(true)
    expect(json.data.tenant.status).toBe('active')
    expect(mockUpdatePlatformTenantStatus).toHaveBeenCalledWith(MOCK_ENV.DB, 'tenant-1', 'active')
  })
})
