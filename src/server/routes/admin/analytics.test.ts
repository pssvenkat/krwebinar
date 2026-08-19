/**
 * Analytics route tests — Phase 9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@hono/zod-validator')

// ── Mock DB helpers ───────────────────────────────────────────────

const mockGetPlatformAnalytics = vi.fn()
const mockGetWebinarAnalytics = vi.fn()
const mockGetRegistrationsCsvRows = vi.fn()

vi.mock('../../lib/db', () => ({
  getPlatformAnalytics: (...args: unknown[]) => mockGetPlatformAnalytics(...args),
  getWebinarAnalytics: (...args: unknown[]) => mockGetWebinarAnalytics(...args),
  getRegistrationsCsvRows: (...args: unknown[]) => mockGetRegistrationsCsvRows(...args),
}))

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
}))

// ── Fixtures ──────────────────────────────────────────────────────

const MOCK_PLATFORM = {
  totalWebinars: 5,
  publishedWebinars: 3,
  liveWebinars: 1,
  totalRegistrations: 120,
  totalAttended: 84,
  overallAttendanceRate: 70,
  thisMonthRegistrations: 45,
  topWebinars: [
    { id: 'w1', title: 'Webinar One', registrations: 60, attended: 50, attendanceRate: 83 },
  ],
}

const MOCK_WEBINAR_ANALYTICS = {
  webinarId: 'w1',
  title: 'Webinar One',
  status: 'ENDED',
  totalRegistrations: 60,
  attendedCount: 50,
  attendanceRate: 83,
  registrationsByDay: [{ date: '2025-01-10', count: 20 }],
  countryCounts: [{ country: 'IN', count: 55 }],
}

const MOCK_CSV_ROW = {
  name: 'Alice',
  email: 'alice@example.com',
  phone: '+91999',
  country: 'IN',
  city: 'Coimbatore',
  attended: 'Yes',
  registered_at: '2025-01-10T10:00:00',
}

// ── App setup ─────────────────────────────────────────────────────

const MOCK_TENANT = { id: 'tenant-1', name: 'Test Tenant', slug: 'test' }
const MOCK_ENV = { DB: {} }

async function buildApp() {
  const { analyticsRoutes } = await import('./analytics')
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('tenant', MOCK_TENANT); await next() })
  app.route('/api/v1/admin', analyticsRoutes)
  return app
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Analytics routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetPlatformAnalytics.mockResolvedValue(MOCK_PLATFORM)
    mockGetWebinarAnalytics.mockImplementation((_db: unknown, webinarId: string) =>
      webinarId === 'w1' ? Promise.resolve(MOCK_WEBINAR_ANALYTICS) : Promise.resolve(null),
    )
    mockGetRegistrationsCsvRows.mockResolvedValue([MOCK_CSV_ROW])
    app = await buildApp()
  })

  // ── Platform analytics ────────────────────────────────────────

  describe('GET /api/v1/admin/analytics', () => {
    it('returns platform analytics', async () => {
      const res = await app.fetch(new Request('http://localhost/api/v1/admin/analytics'), MOCK_ENV)
      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: typeof MOCK_PLATFORM }
      expect(json.ok).toBe(true)
      expect(json.data.totalWebinars).toBe(5)
      expect(json.data.overallAttendanceRate).toBe(70)
      expect(json.data.topWebinars).toHaveLength(1)
    })
  })

  // ── Per-webinar analytics ──────────────────────────────────────

  describe('GET /api/v1/admin/webinars/:id/analytics', () => {
    it('returns webinar analytics for a valid webinar', async () => {
      const res = await app.fetch(new Request('http://localhost/api/v1/admin/webinars/w1/analytics'), MOCK_ENV)
      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: typeof MOCK_WEBINAR_ANALYTICS }
      expect(json.ok).toBe(true)
      expect(json.data.attendanceRate).toBe(83)
      expect(json.data.registrationsByDay).toHaveLength(1)
    })

    it('returns 404 for unknown webinar', async () => {
      const res = await app.fetch(new Request('http://localhost/api/v1/admin/webinars/no-such/analytics'), MOCK_ENV)
      expect(res.status).toBe(404)
      const json = await res.json() as { ok: boolean }
      expect(json.ok).toBe(false)
    })
  })

  // ── CSV export ────────────────────────────────────────────────

  describe('GET /api/v1/admin/webinars/:id/export', () => {
    it('returns CSV with correct Content-Type and data row', async () => {
      const res = await app.fetch(new Request('http://localhost/api/v1/admin/webinars/w1/export'), MOCK_ENV)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/csv')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')
      const csv = await res.text()
      expect(csv).toContain('Name,Email')
      expect(csv).toContain('"Alice"')
      expect(csv).toContain('"alice@example.com"')
      expect(csv).toContain('"Yes"')
    })

    it('escapes double quotes in CSV values', async () => {
      mockGetRegistrationsCsvRows.mockResolvedValueOnce([
        { name: 'Bob "The Builder"', email: 'bob@example.com', phone: '', country: 'IN', city: '', attended: 'No', registered_at: '2025-01-11T10:00:00' },
      ])
      const res = await app.fetch(new Request('http://localhost/api/v1/admin/webinars/w1/export'), MOCK_ENV)
      const csv = await res.text()
      expect(csv).toContain('"Bob ""The Builder"""')
    })
  })
})
