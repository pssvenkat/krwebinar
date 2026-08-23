/**
 * Platform user directory route tests
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

const mockListAllPlatformUsers = vi.fn()
const mockCreateUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockUpdateUserPassword = vi.fn()
const mockDeleteUser = vi.fn()
const mockFindUserById = vi.fn()

vi.mock('../../lib/db', () => ({
  listAllPlatformUsers: (...a: unknown[]) => mockListAllPlatformUsers(...a),
  createUser: (...a: unknown[]) => mockCreateUser(...a),
  updateUser: (...a: unknown[]) => mockUpdateUser(...a),
  updateUserPassword: (...a: unknown[]) => mockUpdateUserPassword(...a),
  deleteUser: (...a: unknown[]) => mockDeleteUser(...a),
  findUserById: (...a: unknown[]) => mockFindUserById(...a),
}))

vi.mock('../../lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('mock_hashed_pw'),
}))

const MOCK_USER = {
  id: 'user-1',
  name: 'Test Owner',
  email: 'owner@krwebinar.com',
  role: 'PLATFORM_OWNER',
  tenant_id: null,
  tenant_name: null,
  tenant_slug: null,
  is_active: 1,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
}

describe('Platform User Directory Routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    const { platformUserRoutes } = await import('./users')
    app = new Hono()
    app.route('/api/platform/users', platformUserRoutes)
    app.route('/api/v1/platform/users', platformUserRoutes)
  })

  it('GET /api/platform/users returns list of users', async () => {
    mockListAllPlatformUsers.mockResolvedValue([MOCK_USER])
    const res = await app.request('/api/platform/users', { method: 'GET' }, { DB: {} })
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: { users: unknown[] } }
    expect(json.ok).toBe(true)
    expect(json.data.users).toHaveLength(1)
  })

  it('GET /api/v1/platform/users returns list of users', async () => {
    mockListAllPlatformUsers.mockResolvedValue([MOCK_USER])
    const res = await app.request('/api/v1/platform/users', { method: 'GET' }, { DB: {} })
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean; data: { users: unknown[] } }
    expect(json.ok).toBe(true)
    expect(json.data.users).toHaveLength(1)
  })

  it('POST /api/v1/platform/users creates a user', async () => {
    mockCreateUser.mockResolvedValue(MOCK_USER)
    const res = await app.request(
      '/api/v1/platform/users',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Admin',
          email: 'admin@tenant.com',
          password: 'Password123!',
          role: 'VENDOR_ADMIN',
          tenantId: 'tenant-123',
        }),
      },
      { DB: {} },
    )
    expect(res.status).toBe(201)
    const json = await res.json() as { ok: boolean; data: { user: typeof MOCK_USER } }
    expect(json.ok).toBe(true)
  })

  it('PUT /api/v1/platform/users/:id updates a user', async () => {
    mockFindUserById.mockResolvedValue(MOCK_USER)
    mockUpdateUser.mockResolvedValue(undefined)
    const res = await app.request(
      '/api/v1/platform/users/user-1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: 0 }),
      },
      { DB: {} },
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean }
    expect(json.ok).toBe(true)
  })

  it('POST /api/v1/platform/users/:id/reset-password updates password', async () => {
    mockFindUserById.mockResolvedValue(MOCK_USER)
    mockUpdateUserPassword.mockResolvedValue(undefined)
    const res = await app.request(
      '/api/v1/platform/users/user-1/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'NewPassword123!' }),
      },
      { DB: {} },
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean }
    expect(json.ok).toBe(true)
  })

  it('DELETE /api/v1/platform/users/:id deletes a user', async () => {
    mockFindUserById.mockResolvedValue(MOCK_USER)
    mockDeleteUser.mockResolvedValue(undefined)
    const res = await app.request(
      '/api/v1/platform/users/user-1',
      { method: 'DELETE' },
      { DB: {} },
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { ok: boolean }
    expect(json.ok).toBe(true)
  })
})
