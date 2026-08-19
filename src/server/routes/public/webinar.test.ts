/**
 * Phase 4 — Registration + Attend + Feedback route tests
 *
 * Uses Hono's app.fetch() with a mock env so c.env.DB doesn't throw.
 * All DB functions are auto-mocked via vi.mock; tests set return values
 * with vi.mocked(...).mockResolvedValueOnce.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { publicWebinarRoutes } from './webinar'
import type { Env, HonoVariables, TenantContext, DbWebinar, DbRegistration } from '../../types'

// Mock @hono/zod-validator (ESM-only — can't load in Node test env)
// Passthrough: attaches parsed body as c.req.valid('json') result
vi.mock('@hono/zod-validator', () => ({
  zValidator: (_target: string, _schema: unknown) =>
    async (c: { req: { json: () => Promise<unknown> } }, next: () => Promise<void>) => {
      const body = await c.req.json().catch(() => ({}))
      ;(c.req as unknown as Record<string, unknown>)['valid'] = () => body
      await next()
    },
}))

// Auto-mock all DB helpers and JWT
vi.mock('../../lib/db')
vi.mock('../../lib/jwt', () => ({
  generateSecureToken: vi.fn().mockReturnValue('abc123testtoken'),
  signJWT: vi.fn(),
  verifyJWT: vi.fn(),
  hashToken: vi.fn(),
}))

// Mock email module — no real sends in tests
vi.mock('../../lib/email', () => ({
  sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendLiveNotifications: vi.fn().mockResolvedValue(undefined),
  sendFeedbackRequests: vi.fn().mockResolvedValue(undefined),
}))

import {
  getPublicWebinar,
  countRegistrations,
  findExistingRegistration,
  createRegistration,
  findRegistrationByToken,
  createLeadCapture,
  createConsentRecord,
  markAttended,
  countFeedbackForRegistration,
  getWebinarById,
} from '../../lib/db'

// ── Test helpers ──────────────────────────────────────────────────

const TENANT_CTX: TenantContext = {
  id: 'tenant-1',
  slug: 'krave',
  name: 'Krave Microgreens',
  planTier: 'starter',
  status: 'active',
}

// Mock env — with DB mock support
const MOCK_ENV = {
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }),
  } as unknown,
  ENVIRONMENT: 'development',
  JWT_SECRET: 'test-secret',
  TURNSTILE_SECRET_KEY: '',
} as Env

const MOCK_WEBINAR: DbWebinar = {
  id: 'webinar-1',
  tenant_id: 'tenant-1',
  title: 'Microgreens 101',
  description: 'Learn to grow',
  host_name: 'Priya',
  start_date: '2025-09-01',
  start_time: '10:00',
  end_time: '11:00',
  timezone: 'Asia/Kolkata',
  youtube_video_id: null,
  status: 'PUBLISHED',
  max_participants: 100,
  registration_open: 1,
  created_by: null,
  created_at: '2025-08-01T00:00:00Z',
  updated_at: '2025-08-01T00:00:00Z',
}

const MOCK_REGISTRATION: DbRegistration = {
  id: 'reg-1',
  tenant_id: 'tenant-1',
  webinar_id: 'webinar-1',
  name: 'Test User',
  email: 'test@example.com',
  phone_e164: null,
  country_code: 'IN',
  state_province: null,
  city: null,
  access_token: 'validtoken123',
  attended: 0,
  registered_at: '2025-08-15T10:00:00Z',
  attended_at: null,
  email_opt_out: 0,
}

/** Mock ExecutionContext — provides waitUntil so c.executionCtx.waitUntil() doesn't throw */
const MOCK_CTX: ExecutionContext = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
}

function buildApp() {
  const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()
  // Inject tenant context middleware
  app.use('*', async (c, next) => {
    c.set('tenant', TENANT_CTX)
    return next()
  })
  app.route('/', publicWebinarRoutes)
  return app
}

/** Make a request with mock env + ExecutionContext so no Hono context errors */
async function req(
  app: ReturnType<typeof buildApp>,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, init)
  return app.fetch(request, MOCK_ENV, MOCK_CTX)
}

// ── GET /:id/public ───────────────────────────────────────────────

describe('GET /:id/public', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when webinar not found', async () => {
    vi.mocked(getPublicWebinar).mockResolvedValueOnce(null)
    const app = buildApp()
    const res = await req(app, '/webinar-999/public')
    expect(res.status).toBe(404)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(false)
  })

  it('returns webinar data with spots info', async () => {
    vi.mocked(getPublicWebinar).mockResolvedValueOnce(MOCK_WEBINAR)
    vi.mocked(countRegistrations).mockResolvedValueOnce(10)
    const app = buildApp()
    const res = await req(app, '/webinar-1/public')
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; data: { webinar: { spotsLeft: number } } }
    expect(body.ok).toBe(true)
    expect(body.data.webinar.spotsLeft).toBe(90)
  })

  it('reports isFull when at capacity', async () => {
    vi.mocked(getPublicWebinar).mockResolvedValueOnce(MOCK_WEBINAR)
    vi.mocked(countRegistrations).mockResolvedValueOnce(100)
    const app = buildApp()
    const res = await req(app, '/webinar-1/public')
    const body = await res.json() as { data: { webinar: { isFull: boolean } } }
    expect(body.data.webinar.isFull).toBe(true)
  })
})

// ── POST /:id/register ────────────────────────────────────────────

describe('POST /:id/register', () => {
  beforeEach(() => vi.clearAllMocks())

  const validBody = { name: 'Priya Sharma', email: 'priya@example.com', countryCode: 'IN' }
  const postOpts = (body: unknown) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  it('registers a new participant', async () => {
    vi.mocked(getPublicWebinar).mockResolvedValueOnce(MOCK_WEBINAR)
    vi.mocked(countRegistrations).mockResolvedValueOnce(0)
    vi.mocked(findExistingRegistration).mockResolvedValueOnce(null)
    vi.mocked(createRegistration).mockResolvedValueOnce(MOCK_REGISTRATION)
    vi.mocked(createConsentRecord).mockResolvedValue(undefined)

    const app = buildApp()
    const res = await req(app, '/webinar-1/register', postOpts(validBody))
    expect(res.status).toBe(201)
    const body = await res.json() as { ok: boolean; data: { registration: { alreadyRegistered: boolean } } }
    expect(body.ok).toBe(true)
    expect(body.data.registration.alreadyRegistered).toBe(false)
  })

  it('returns existing registration idempotently', async () => {
    vi.mocked(getPublicWebinar).mockResolvedValueOnce(MOCK_WEBINAR)
    vi.mocked(countRegistrations).mockResolvedValueOnce(5)
    vi.mocked(findExistingRegistration).mockResolvedValueOnce(MOCK_REGISTRATION)

    const app = buildApp()
    const res = await req(app, '/webinar-1/register', postOpts(validBody))
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { registration: { alreadyRegistered: boolean } } }
    expect(body.data.registration.alreadyRegistered).toBe(true)
  })

  it('returns 409 when webinar is full', async () => {
    vi.mocked(getPublicWebinar).mockResolvedValueOnce(MOCK_WEBINAR)
    vi.mocked(countRegistrations).mockResolvedValueOnce(100)

    const app = buildApp()
    const res = await req(app, '/webinar-1/register', postOpts(validBody))
    expect(res.status).toBe(409)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('WEBINAR_FULL')
  })

  it('returns 409 when registration is closed', async () => {
    vi.mocked(getPublicWebinar).mockResolvedValueOnce({ ...MOCK_WEBINAR, registration_open: 0 })
    vi.mocked(countRegistrations).mockResolvedValueOnce(0)

    const app = buildApp()
    const res = await req(app, '/webinar-1/register', postOpts(validBody))
    expect(res.status).toBe(409)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('REGISTRATION_CLOSED')
  })
})

// ── GET /attend/:token ────────────────────────────────────────────

describe('GET /attend/:token', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 for invalid token', async () => {
    vi.mocked(findRegistrationByToken).mockResolvedValueOnce(null)
    const app = buildApp()
    const res = await req(app, '/attend/badtoken')
    expect(res.status).toBe(401)
  })

  it('returns webinar and registration for valid token', async () => {
    vi.mocked(findRegistrationByToken).mockResolvedValueOnce(MOCK_REGISTRATION)
    vi.mocked(getWebinarById).mockResolvedValueOnce(MOCK_WEBINAR)
    vi.mocked(markAttended).mockResolvedValue(undefined)

    const app = buildApp()
    const res = await req(app, '/attend/validtoken123')
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; data: { webinar: { id: string } } }
    expect(body.ok).toBe(true)
    expect(body.data.webinar.id).toBe('webinar-1')
  })

  it('blocks cross-tenant token access', async () => {
    vi.mocked(findRegistrationByToken).mockResolvedValueOnce({
      ...MOCK_REGISTRATION,
      tenant_id: 'other-tenant',
    })
    const app = buildApp()
    const res = await req(app, '/attend/validtoken123')
    expect(res.status).toBe(401)
  })
})

// ── POST /:id/feedback ────────────────────────────────────────────

describe('POST /:id/feedback', () => {
  beforeEach(() => vi.clearAllMocks())

  const endedWebinar: DbWebinar = { ...MOCK_WEBINAR, status: 'ENDED' }
  const validBody = {
    accessToken: 'validtoken123',
    rating: 5,
    suggestion: 'Great webinar!',
    interests: ['microgreens_kit'],
    contactRequested: false,
  }
  const postOpts = (body: unknown) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  it('submits feedback successfully', async () => {
    vi.mocked(findRegistrationByToken).mockResolvedValueOnce(MOCK_REGISTRATION)
    vi.mocked(getWebinarById).mockResolvedValueOnce(endedWebinar)
    vi.mocked(countFeedbackForRegistration).mockResolvedValueOnce(0)
    vi.mocked(createLeadCapture).mockResolvedValue({
      id: 'lead-1', tenant_id: 'tenant-1', webinar_id: 'webinar-1',
      registration_id: 'reg-1', name: 'Test User', email: 'test@example.com',
      phone_e164: null, country_code: null, interests: '[]', rating: 5,
      suggestion: 'Great!', contact_requested: 0, preferred_contact: null,
      created_at: '2025-09-01T12:00:00Z',
    })

    const app = buildApp()
    const res = await req(app, '/webinar-1/feedback', postOpts(validBody))
    expect(res.status).toBe(201)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('prevents duplicate feedback submission', async () => {
    vi.mocked(findRegistrationByToken).mockResolvedValueOnce(MOCK_REGISTRATION)
    vi.mocked(getWebinarById).mockResolvedValueOnce(endedWebinar)
    vi.mocked(countFeedbackForRegistration).mockResolvedValueOnce(1)

    const app = buildApp()
    const res = await req(app, '/webinar-1/feedback', postOpts(validBody))
    expect(res.status).toBe(409)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('ALREADY_SUBMITTED')
  })

  it('returns 409 when webinar is not ended', async () => {
    vi.mocked(findRegistrationByToken).mockResolvedValueOnce(MOCK_REGISTRATION)
    vi.mocked(getWebinarById).mockResolvedValueOnce(MOCK_WEBINAR) // PUBLISHED not ENDED

    const app = buildApp()
    const res = await req(app, '/webinar-1/feedback', postOpts(validBody))
    expect(res.status).toBe(409)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('NOT_ALLOWED')
  })
})

describe('POST /attend/verify-phone', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates registered phone number successfully', async () => {
    vi.mocked(getWebinarById).mockResolvedValueOnce(MOCK_WEBINAR)
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValueOnce({
            results: [
              {
                id: 'reg-1',
                name: 'Verified Attendee',
                email: 'verified@example.com',
                phone_e164: '+919876543210',
                access_token: 'token-abc-123',
              },
            ],
          }),
        }),
      }),
    }

    const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()
    app.use('*', async (c, next) => {
      c.set('tenant', TENANT_CTX)
      await next()
    })
    app.route('/', publicWebinarRoutes)

    const res = await app.fetch(
      new Request('http://localhost/attend/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webinarId: 'webinar-1', phone: '9876543210' }),
      }),
      { ...MOCK_ENV, DB: mockDb as unknown } as Env,
      MOCK_CTX,
    )

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; data: any }
    expect(body.ok).toBe(true)
    expect(body.data.accessToken).toBe('token-abc-123')
    expect(body.data.registration.name).toBe('Verified Attendee')
  })

  it('rejects unregistered phone number with 403 NOT_REGISTERED', async () => {
    vi.mocked(getWebinarById).mockResolvedValueOnce(MOCK_WEBINAR)
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValueOnce({
            results: [
              {
                id: 'reg-1',
                name: 'Other Attendee',
                email: 'other@example.com',
                phone_e164: '+919999999999',
                access_token: 'token-other',
              },
            ],
          }),
        }),
      }),
    }

    const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()
    app.use('*', async (c, next) => {
      c.set('tenant', TENANT_CTX)
      await next()
    })
    app.route('/', publicWebinarRoutes)

    const res = await app.fetch(
      new Request('http://localhost/attend/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webinarId: 'webinar-1', phone: '9876543210' }),
      }),
      { ...MOCK_ENV, DB: mockDb as unknown } as Env,
      MOCK_CTX,
    )

    expect(res.status).toBe(403)
    const body = await res.json() as { ok: boolean; error: { code: string } }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('NOT_REGISTERED')
  })
})
