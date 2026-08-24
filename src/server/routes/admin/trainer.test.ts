/**
 * Trainer Profile route tests
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

const mockGetTrainerProfile = vi.fn()
const mockUpsertTrainerProfile = vi.fn()

vi.mock('../../lib/db', () => ({
  getTrainerProfile: (...a: unknown[]) => mockGetTrainerProfile(...a),
  upsertTrainerProfile: (...a: unknown[]) => mockUpsertTrainerProfile(...a),
}))

const MOCK_TRAINER = {
  name: 'Shanthi Ramakrishnamurthy',
  title: 'Lead Trainer & Microgreens Specialist, Krave Microgreens',
  bio: 'Urban farming advocate and lead trainer.',
  avatar_url: 'data:image/png;base64,mock',
  highlights: ['2,000+ students trained', 'Microgreens Pioneer'],
  experience_years: '8+ Years Experience',
  whatsapp_community_url: 'https://chat.whatsapp.com/test',
  social_links: { website: 'https://kravemicrogreens.in' },
}

describe('Trainer Profile Routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    const { trainerRoutes } = await import('./trainer')

    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('tenant', { id: 'tenant-123', slug: 'krave', name: 'Krave Microgreens' })
      c.env = { DB: {} } as any
      await next()
    })
    app.route('/api/v1/admin', trainerRoutes)
    app.route('/api/v1', trainerRoutes)
  })

  it('GET /api/v1/admin/trainer returns trainer profile', async () => {
    mockGetTrainerProfile.mockResolvedValue(MOCK_TRAINER)

    const res = await app.request('/api/v1/admin/trainer')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('Shanthi Ramakrishnamurthy')
    expect(json.data.highlights).toContain('2,000+ students trained')
  })

  it('PUT /api/v1/admin/trainer updates trainer profile', async () => {
    mockUpsertTrainerProfile.mockResolvedValue({
      ...MOCK_TRAINER,
      name: 'Venkat Trainer',
    })

    const res = await app.request('/api/v1/admin/trainer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Venkat Trainer',
        title: 'Senior Masterclass Host',
      }),
    })

    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('Venkat Trainer')
    expect(mockUpsertTrainerProfile).toHaveBeenCalled()
  })

  it('GET /api/v1/public/trainer returns public trainer profile without auth', async () => {
    mockGetTrainerProfile.mockResolvedValue(MOCK_TRAINER)

    const res = await app.request('/api/v1/public/trainer')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('Shanthi Ramakrishnamurthy')
    expect(json.data.experience_years).toBe('8+ Years Experience')
  })
})
