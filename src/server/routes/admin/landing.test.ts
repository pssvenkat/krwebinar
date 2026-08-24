/**
 * Landing Page CMS & Fallback Redirect route unit tests
 */

import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { landingAdminRoutes } from './landing'
import type { Env, HonoVariables, TenantContext, UserPayload } from '../../types'
import { DEFAULT_LANDING_PAGE_SETTINGS } from '../../lib/db'

// Mock @hono/zod-validator
vi.mock('@hono/zod-validator', () => ({
  zValidator: (_target: string, _schema: unknown) =>
    async (
      c: { req: { json: () => Promise<unknown>; addValidatedData: (t: string, d: unknown) => void } },
      next: () => Promise<void>,
    ) => {
      const body = await c.req.json().catch(() => ({}))
      c.req.addValidatedData('json', body)
      await next()
    },
}))

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}))

vi.mock('../../lib/db')

import { getLandingPageSettings, upsertLandingPageSettings } from '../../lib/db'

const TENANT_CTX: TenantContext = {
  id: 'tenant-1',
  slug: 'krave',
  name: 'Krave Microgreens',
  planTier: 'starter',
  status: 'active',
}

const ADMIN_USER: UserPayload = {
  sub: 'user-1',
  email: 'admin@kravemicrogreens.in',
  role: 'VENDOR_ADMIN',
  tenantId: 'tenant-1',
  name: 'Admin User',
}

const MOCK_ENV = {
  DB: {} as unknown,
  ENVIRONMENT: 'test',
  JWT_SECRET: 'test-secret',
} as Env

describe('Landing Page CMS Routes', () => {
  it('GET /api/v1/admin/landing returns current landing page CMS configuration', async () => {
    vi.mocked(getLandingPageSettings).mockResolvedValueOnce(DEFAULT_LANDING_PAGE_SETTINGS)

    const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()
    app.use('*', async (c, next) => {
      c.set('tenant', TENANT_CTX)
      c.set('user', ADMIN_USER)
      await next()
    })
    app.route('/', landingAdminRoutes)

    const res = await app.fetch(new Request('http://localhost/landing'), MOCK_ENV)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.ok).toBe(true)
    expect(body.data.fallback_redirect_url).toBe('https://kravemicrogreens.in')
    expect(body.data.fallback_redirect_secs).toBe(5)
    expect(body.data.fallback_title).toBe('No Live Webinar Scheduled At The Moment')
  })

  it('PUT /api/v1/admin/landing updates landing page CMS settings', async () => {
    const updatedMock = {
      ...DEFAULT_LANDING_PAGE_SETTINGS,
      fallback_redirect_url: 'https://kravefoods.in',
      fallback_redirect_secs: 10,
    }
    vi.mocked(upsertLandingPageSettings).mockResolvedValueOnce(updatedMock)

    const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()
    app.use('*', async (c, next) => {
      c.set('tenant', TENANT_CTX)
      c.set('user', ADMIN_USER)
      await next()
    })
    app.route('/', landingAdminRoutes)

    const res = await app.fetch(
      new Request('http://localhost/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fallback_redirect_url: 'https://kravefoods.in',
          fallback_redirect_secs: 10,
        }),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.ok).toBe(true)
    expect(body.data.fallback_redirect_url).toBe('https://kravefoods.in')
    expect(body.data.fallback_redirect_secs).toBe(10)
  })

  it('GET /api/v1/public/landing-config returns public configuration without auth', async () => {
    vi.mocked(getLandingPageSettings).mockResolvedValueOnce(DEFAULT_LANDING_PAGE_SETTINGS)

    const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()
    app.use('*', async (c, next) => {
      c.set('tenant', TENANT_CTX)
      await next()
    })
    app.route('/', landingAdminRoutes)

    const res = await app.fetch(new Request('http://localhost/public/landing-config'), MOCK_ENV)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.ok).toBe(true)
    expect(body.data.fallback_redirect_url).toBe('https://kravemicrogreens.in')
  })
})
