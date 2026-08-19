import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { healthRouter } from './health'

describe('Health Routes', () => {
  const app = new Hono()
  app.route('/api', healthRouter)

  it('GET /api/health returns liveness status', async () => {
    const res = await app.fetch(new Request('http://localhost/api/health'), {
      ENVIRONMENT: 'production',
      DB: {},
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { ok: boolean; data: { status: string; environment: string } }
    expect(json.ok).toBe(true)
    expect(json.data.status).toBe('ok')
    expect(json.data.environment).toBe('production')
  })

  it('GET /api/health/ready returns 200 when D1 ping passes', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ ping: 1 }),
      }),
    }

    const res = await app.fetch(new Request('http://localhost/api/health/ready'), {
      ENVIRONMENT: 'production',
      DB: mockDb,
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      ok: boolean
      data: { status: string; checks: { database: { status: string } } }
    }
    expect(json.ok).toBe(true)
    expect(json.data.status).toBe('ready')
    expect(json.data.checks.database.status).toBe('pass')
  })

  it('GET /api/health/ready returns 503 when D1 ping fails', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('D1 connection timeout')),
      }),
    }

    const res = await app.fetch(new Request('http://localhost/api/health/ready'), {
      ENVIRONMENT: 'production',
      DB: mockDb,
    })
    expect(res.status).toBe(503)
    const json = (await res.json()) as {
      ok: boolean
      data: { status: string; checks: { database: { status: string; error: string } } }
    }
    expect(json.ok).toBe(false)
    expect(json.data.status).toBe('unhealthy')
    expect(json.data.checks.database.status).toBe('fail')
    expect(json.data.checks.database.error).toContain('D1 connection timeout')
  })
})
