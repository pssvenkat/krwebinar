import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { rateLimiter, _resetRateLimitStore } from './rate-limit'

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    _resetRateLimitStore()
  })

  it('allows requests within limit and sets proper headers', async () => {
    const app = new Hono()
    app.use('/test', rateLimiter({ windowSeconds: 60, max: 3, keyPrefix: 'test' }))
    app.get('/test', (c) => c.json({ ok: true }))

    const req = () =>
      app.fetch(
        new Request('http://localhost/test', {
          headers: { 'cf-connecting-ip': '1.2.3.4' },
        }),
      )

    // Call 1
    const res1 = await req()
    expect(res1.status).toBe(200)
    expect(res1.headers.get('X-RateLimit-Limit')).toBe('3')
    expect(res1.headers.get('X-RateLimit-Remaining')).toBe('2')

    // Call 2
    const res2 = await req()
    expect(res2.status).toBe(200)
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('1')

    // Call 3
    const res3 = await req()
    expect(res3.status).toBe(200)
    expect(res3.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('blocks requests exceeding limit with 429 and Retry-After header', async () => {
    const app = new Hono()
    app.use('/test', rateLimiter({ windowSeconds: 60, max: 2, keyPrefix: 'test' }))
    app.get('/test', (c) => c.json({ ok: true }))

    const req = () =>
      app.fetch(
        new Request('http://localhost/test', {
          headers: { 'cf-connecting-ip': '5.6.7.8' },
        }),
      )

    await req() // 1
    await req() // 2

    // Call 3 should be blocked
    const res3 = await req()
    expect(res3.status).toBe(429)
    expect(res3.headers.get('Retry-After')).toBeDefined()
    const json = (await res3.json()) as { ok: boolean; error: { code: string; retryAfterSeconds: number } }
    expect(json.ok).toBe(false)
    expect(json.error.code).toBe('TOO_MANY_REQUESTS')
    expect(json.error.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('tracks different client IPs independently', async () => {
    const app = new Hono()
    app.use('/test', rateLimiter({ windowSeconds: 60, max: 1, keyPrefix: 'test' }))
    app.get('/test', (c) => c.json({ ok: true }))

    const resA1 = await app.fetch(
      new Request('http://localhost/test', { headers: { 'cf-connecting-ip': '10.0.0.1' } }),
    )
    expect(resA1.status).toBe(200)

    const resB1 = await app.fetch(
      new Request('http://localhost/test', { headers: { 'cf-connecting-ip': '10.0.0.2' } }),
    )
    expect(resB1.status).toBe(200)

    const resA2 = await app.fetch(
      new Request('http://localhost/test', { headers: { 'cf-connecting-ip': '10.0.0.1' } }),
    )
    expect(resA2.status).toBe(429)
  })
})
