/**
 * Admin leads route tests — Phase 11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@hono/zod-validator')

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}))

// ── Mock DB helpers ───────────────────────────────────────────────

const mockGetLeadsForWebinar = vi.fn()
const mockGetLeadsSummary = vi.fn()
const mockGetLeadsCsvRows = vi.fn()

vi.mock('../../lib/db', () => ({
  getLeadsForWebinar: (...a: unknown[]) => mockGetLeadsForWebinar(...a),
  getLeadsSummary:    (...a: unknown[]) => mockGetLeadsSummary(...a),
  getLeadsCsvRows:    (...a: unknown[]) => mockGetLeadsCsvRows(...a),
}))

// ── Fixtures ──────────────────────────────────────────────────────

const MOCK_LEAD = {
  id: 'lead-1',
  name: 'Alice',
  email: 'alice@example.com',
  phone_e164: '+919999999999',
  country_code: 'IN',
  interests: '["microgreens_kit"]',
  rating: 5,
  suggestion: 'Great session!',
  contact_requested: 1,
  preferred_contact: 'email',
  created_at: '2025-01-10T10:00:00',
}

const MOCK_SUMMARY = {
  totalLeads: 1,
  avgRating: 5.0,
  contactRequested: 1,
  ratingCounts: [{ rating: 5, count: 1 }],
}

const MOCK_CSV_ROW = {
  name: 'Alice',
  email: 'alice@example.com',
  phone: '+919999999999',
  country: 'IN',
  rating: '5',
  suggestion: 'Great session!',
  interests: 'microgreens_kit',
  contact_requested: 'Yes',
  preferred_contact: 'email',
  created_at: '2025-01-10T10:00:00',
}

const MOCK_TENANT = { id: 'tenant-1', name: 'Test Co', slug: 'test' }
const MOCK_ENV = { DB: {} }

async function buildApp() {
  const { leadsRoutes } = await import('./leads')
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('tenant', MOCK_TENANT); await next() })
  app.route('/api/v1/admin', leadsRoutes)
  return app
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Admin leads routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetLeadsForWebinar.mockResolvedValue({ leads: [MOCK_LEAD], total: 1 })
    mockGetLeadsSummary.mockResolvedValue(MOCK_SUMMARY)
    mockGetLeadsCsvRows.mockResolvedValue([MOCK_CSV_ROW])
    app = await buildApp()
  })

  // ── GET leads ─────────────────────────────────────────────────

  describe('GET /api/v1/admin/webinars/:id/leads', () => {
    it('returns leads list with summary', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/v1/admin/webinars/w1/leads'),
        MOCK_ENV,
      )
      expect(res.status).toBe(200)
      const json = await res.json() as {
        ok: boolean
        data: { leads: typeof MOCK_LEAD[]; total: number; summary: typeof MOCK_SUMMARY }
      }
      expect(json.ok).toBe(true)
      expect(json.data.total).toBe(1)
      expect(json.data.leads).toHaveLength(1)
      expect(json.data.leads[0].name).toBe('Alice')
      expect(json.data.summary.avgRating).toBe(5.0)
    })

    it('parses interests JSON into an array', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/v1/admin/webinars/w1/leads'),
        MOCK_ENV,
      )
      const json = await res.json() as { ok: boolean; data: { leads: { interests: string[] }[] } }
      expect(Array.isArray(json.data.leads[0].interests)).toBe(true)
      expect(json.data.leads[0].interests).toContain('microgreens_kit')
    })
  })

  // ── CSV export ────────────────────────────────────────────────

  describe('GET /api/v1/admin/webinars/:id/leads/export', () => {
    it('returns CSV with correct headers and row', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/v1/admin/webinars/w1/leads/export'),
        MOCK_ENV,
      )
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/csv')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')
      const csv = await res.text()
      expect(csv).toContain('Name,Email')
      expect(csv).toContain('"Alice"')
      expect(csv).toContain('"alice@example.com"')
      expect(csv).toContain('"5"')
      expect(csv).toContain('"Yes"')
    })

    it('escapes quotes in CSV values', async () => {
      mockGetLeadsCsvRows.mockResolvedValueOnce([
        { ...MOCK_CSV_ROW, name: 'Bob "Builder"', suggestion: 'He said "great"' },
      ])
      const res = await app.fetch(
        new Request('http://localhost/api/v1/admin/webinars/w1/leads/export'),
        MOCK_ENV,
      )
      const csv = await res.text()
      expect(csv).toContain('"Bob ""Builder"""')
      expect(csv).toContain('"He said ""great"""')
    })
  })
})
