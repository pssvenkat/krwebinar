/**
 * Admin & Public Privacy / DPDP Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
  requireRole: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}))

const mockListConsentRecords = vi.fn()
const mockCountConsentRecords = vi.fn()
const mockPurgeTenantUserData = vi.fn()
const mockListDpdpErasureRequests = vi.fn()
const mockProcessDpdpErasureRequest = vi.fn()
const mockCreateDpdpErasureRequest = vi.fn()

vi.mock('../../lib/db', () => ({
  listConsentRecords: (...a: unknown[]) => mockListConsentRecords(...a),
  countConsentRecords: (...a: unknown[]) => mockCountConsentRecords(...a),
  purgeTenantUserData: (...a: unknown[]) => mockPurgeTenantUserData(...a),
  listDpdpErasureRequests: (...a: unknown[]) => mockListDpdpErasureRequests(...a),
  processDpdpErasureRequest: (...a: unknown[]) => mockProcessDpdpErasureRequest(...a),
  createDpdpErasureRequest: (...a: unknown[]) => mockCreateDpdpErasureRequest(...a),
}))

import { privacyAdminRoutes } from './privacy'
import { privacyPublicRoutes } from '../public/privacy'

const MOCK_ENV = { DB: {}, ENVIRONMENT: 'test', JWT_SECRET: 'test-secret' }

function createAdminApp() {
  const app = new Hono<{
    Bindings: typeof MOCK_ENV
    Variables: {
      tenant: { id: string; slug: string; name: string }
      jwtPayload: { sub: string; email: string; role: string; tenant_id: string }
    }
  }>()

  app.use('*', async (c, next) => {
    c.set('tenant', { id: 'tenant-123', slug: 'krave', name: 'Krave' })
    c.set('jwtPayload', { sub: 'user-admin', email: 'admin@krave.in', role: 'VENDOR_ADMIN', tenant_id: 'tenant-123' })
    await next()
  })

  app.route('/admin/privacy', privacyAdminRoutes)
  return app
}

function createPublicApp() {
  const app = new Hono<{
    Bindings: typeof MOCK_ENV
    Variables: {
      tenant: { id: string; slug: string; name: string }
    }
  }>()

  app.use('*', async (c, next) => {
    c.set('tenant', { id: 'tenant-123', slug: 'krave', name: 'Krave' })
    await next()
  })

  app.route('/public/privacy', privacyPublicRoutes)
  return app
}

describe('Admin Privacy & Consent API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /admin/privacy/consents returns consent records and pagination', async () => {
    mockListConsentRecords.mockResolvedValueOnce([
      {
        id: 'consent-1',
        tenant_id: 'tenant-123',
        subject_email: 'test@example.com',
        subject_phone: '+919876543210',
        consent_type: 'marketing',
        granted: 1,
        legal_basis: 'consent',
        recorded_at: '2026-08-24T10:00:00Z',
      },
    ])
    mockCountConsentRecords.mockResolvedValueOnce(1)

    const app = createAdminApp()
    const res = await app.request(
      '/admin/privacy/consents?page=1&limit=10',
      { method: 'GET' },
      MOCK_ENV,
    )

    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.ok).toBe(true)
    expect(json.data.records).toHaveLength(1)
    expect(json.data.records[0].subject_email).toBe('test@example.com')
    expect(json.data.pagination.total).toBe(1)
  })

  it('DELETE /admin/privacy/purge-user purges attendee data by email', async () => {
    mockPurgeTenantUserData.mockResolvedValueOnce({
      email: 'delete_me@example.com',
      deletedRegistrations: 2,
      deletedLeads: 1,
      deletedFeedbacks: 1,
      deletedConsents: 3,
      totalDeleted: 7,
    })

    const app = createAdminApp()
    const res = await app.request(
      '/admin/privacy/purge-user',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'delete_me@example.com' }),
      },
      MOCK_ENV,
    )

    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.ok).toBe(true)
    expect(json.data.result.totalDeleted).toBe(7)
  })

  it('GET /admin/privacy/erasure-requests returns list of erasure requests', async () => {
    mockListDpdpErasureRequests.mockResolvedValueOnce({
      requests: [
        {
          id: 'req-1',
          tenant_id: 'tenant-123',
          email: 'purge@example.com',
          phone: null,
          status: 'PENDING',
          created_at: '2026-08-24T11:00:00Z',
        },
      ],
      total: 1,
      pendingCount: 1,
    })

    const app = createAdminApp()
    const res = await app.request(
      '/admin/privacy/erasure-requests?status=PENDING',
      { method: 'GET' },
      MOCK_ENV,
    )

    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.ok).toBe(true)
    expect(json.data.requests).toHaveLength(1)
    expect(json.data.pendingCount).toBe(1)
  })

  it('POST /admin/privacy/erasure-requests/:id/approve approves and executes purge', async () => {
    mockProcessDpdpErasureRequest.mockResolvedValueOnce({
      request: {
        id: 'req-1',
        status: 'COMPLETED',
        processed_at: '2026-08-24T12:00:00Z',
      },
      purgeResult: {
        email: 'purge@example.com',
        deletedRegistrations: 1,
        deletedLeads: 0,
        deletedFeedbacks: 0,
        deletedConsents: 1,
        totalDeleted: 2,
      },
    })

    const app = createAdminApp()
    const res = await app.request(
      '/admin/privacy/erasure-requests/req-1/approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Verified attendee request' }),
      },
      MOCK_ENV,
    )

    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.ok).toBe(true)
    expect(json.data.request.status).toBe('COMPLETED')
    expect(json.data.purgeResult.totalDeleted).toBe(2)
  })
})

describe('Public DPDP Erasure Request API', () => {
  it('POST /public/privacy/erasure-request creates a pending erasure request', async () => {
    mockCreateDpdpErasureRequest.mockResolvedValueOnce({
      id: 'req-new',
      tenant_id: 'tenant-123',
      email: 'attendee@example.com',
      phone: '+919876543210',
      reason: 'No longer want marketing emails',
      status: 'PENDING',
      created_at: '2026-08-24T12:30:00Z',
    })

    const app = createPublicApp()
    const res = await app.request(
      '/public/privacy/erasure-request',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'attendee@example.com',
          phone: '+919876543210',
          reason: 'No longer want marketing emails',
        }),
      },
      MOCK_ENV,
    )

    expect(res.status).toBe(201)
    const json = (await res.json()) as any
    expect(json.ok).toBe(true)
    expect(json.data.requestId).toBe('req-new')
    expect(json.data.status).toBe('PENDING')
  })
})
