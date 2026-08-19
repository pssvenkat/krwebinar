/**
 * Branding + Settings route tests — Phase 10
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

// ── Mock DB helpers ───────────────────────────────────────────────

const mockGetBranding = vi.fn()
const mockUpsertBranding = vi.fn()
const mockGetSettings = vi.fn()
const mockUpsertSettings = vi.fn()
const mockGetPublicBranding = vi.fn()

vi.mock('../../lib/db', () => ({
  getBranding: (...a: unknown[]) => mockGetBranding(...a),
  upsertBranding: (...a: unknown[]) => mockUpsertBranding(...a),
  getSettings: (...a: unknown[]) => mockGetSettings(...a),
  upsertSettings: (...a: unknown[]) => mockUpsertSettings(...a),
  getPublicBranding: (...a: unknown[]) => mockGetPublicBranding(...a),
}))

// ── Fixtures ──────────────────────────────────────────────────────

const MOCK_BRANDING = {
  primary_color: '#4f46e5', secondary_color: '#7c3aed', accent_color: '#06b6d4',
  background_color: '#f9fafb', surface_color: '#ffffff', text_color: '#111827',
  muted_color: '#6b7280', border_color: '#e5e7eb', success_color: '#16a34a',
  warning_color: '#d97706', error_color: '#dc2626',
  font_heading: 'Inter, system-ui, sans-serif', font_body: 'Inter, system-ui, sans-serif',
  logo_url: null, favicon_url: null, custom_css: null,
}

const MOCK_SETTINGS = {
  max_webinars: 10, max_participants: 300,
  chat_rate_limit_messages: 5, chat_rate_limit_window_seconds: 10,
}

const MOCK_PUBLIC_BRANDING = {
  primaryColor: '#4f46e5', secondaryColor: '#7c3aed', accentColor: '#06b6d4',
  backgroundColor: '#f9fafb', surfaceColor: '#ffffff', textColor: '#111827',
  mutedColor: '#6b7280', borderColor: '#e5e7eb', successColor: '#16a34a',
  warningColor: '#d97706', errorColor: '#dc2626',
  fontHeading: 'Inter, system-ui, sans-serif', fontBody: 'Inter, system-ui, sans-serif',
  logoUrl: null, faviconUrl: null, platformName: 'Test Co',
}

const MOCK_TENANT = { id: 'tenant-1', name: 'Test Co', slug: 'test' }
const MOCK_ENV = { DB: {} }

async function buildApp() {
  const { brandingRoutes } = await import('./branding')
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('tenant', MOCK_TENANT); await next() })
  app.route('/api/v1/admin', brandingRoutes)
  app.route('/api/v1', brandingRoutes)
  return app
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Branding routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetBranding.mockResolvedValue(MOCK_BRANDING)
    mockUpsertBranding.mockResolvedValue(undefined)
    mockGetSettings.mockResolvedValue(MOCK_SETTINGS)
    mockUpsertSettings.mockResolvedValue(undefined)
    mockGetPublicBranding.mockResolvedValue(MOCK_PUBLIC_BRANDING)
    app = await buildApp()
  })

  // ── Admin branding GET ────────────────────────────────────────

  it('GET /api/v1/admin/branding returns branding', async () => {
    const res = await app.fetch(new Request('http://localhost/api/v1/admin/branding'), MOCK_ENV)
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: typeof MOCK_BRANDING }
    expect(json.ok).toBe(true)
    expect(json.data.primary_color).toBe('#4f46e5')
  })

  // ── Admin branding PUT ────────────────────────────────────────

  it('PUT /api/v1/admin/branding calls upsertBranding and returns updated data', async () => {
    const body = { primary_color: '#1d4ed8' }
    const res = await app.fetch(
      new Request('http://localhost/api/v1/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(200)
    expect(mockUpsertBranding).toHaveBeenCalledWith(MOCK_ENV.DB, MOCK_TENANT.id, expect.objectContaining({ primary_color: '#1d4ed8' }))
  })

  // ── Admin settings GET ────────────────────────────────────────

  it('GET /api/v1/admin/settings returns settings', async () => {
    const res = await app.fetch(new Request('http://localhost/api/v1/admin/settings'), MOCK_ENV)
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: typeof MOCK_SETTINGS }
    expect(json.ok).toBe(true)
    expect(json.data.max_webinars).toBe(10)
    expect(json.data.max_participants).toBe(300)
  })

  // ── Admin settings PUT ────────────────────────────────────────

  it('PUT /api/v1/admin/settings calls upsertSettings', async () => {
    const body = { max_participants: 500 }
    const res = await app.fetch(
      new Request('http://localhost/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      MOCK_ENV,
    )
    expect(res.status).toBe(200)
    expect(mockUpsertSettings).toHaveBeenCalledWith(MOCK_ENV.DB, MOCK_TENANT.id, expect.objectContaining({ max_participants: 500 }))
  })

  // ── Public branding ───────────────────────────────────────────

  it('GET /api/v1/public/branding returns camelCase public branding', async () => {
    const res = await app.fetch(new Request('http://localhost/api/v1/public/branding'), MOCK_ENV)
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: typeof MOCK_PUBLIC_BRANDING }
    expect(json.ok).toBe(true)
    expect(json.data.primaryColor).toBe('#4f46e5')
    expect(json.data.platformName).toBe('Test Co')
  })
})
