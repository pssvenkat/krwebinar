/**
 * Tenant Admin User Management Routes (/api/v1/admin/users)
 *
 * Scoped to current tenant. Requires VENDOR_ADMIN or VENDOR_OWNER role.
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, HonoVariables } from '../../types'
import { requireAuth, requireRole } from '../../middleware/auth'
import {
  listTenantUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  findUserById,
} from '../../lib/db'
import { hashPassword } from '../../lib/password'

export const adminUserRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

adminUserRoutes.use('*', requireAuth())
adminUserRoutes.use('*', requireRole(['VENDOR_ADMIN', 'VENDOR_OWNER', 'PLATFORM_OWNER']))

// ── GET / — List tenant users ──────────────────────────────────────

adminUserRoutes.get('/', async (c) => {
  const tenant = c.get('tenant')
  const users = await listTenantUsers(c.env.DB, tenant.id)
  return c.json({ ok: true, data: { users } })
})

// ── POST / — Add a team member ─────────────────────────────────────

const addMemberSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['VENDOR_ADMIN', 'MODERATOR', 'PRESENTER']),
})

adminUserRoutes.post('/', zValidator('json', addMemberSchema), async (c) => {
  const tenant = c.get('tenant')
  const data = c.req.valid('json')
  const { generateUlid } = await import('../../lib/ulid')
  const passwordHash = await hashPassword(data.password)

  try {
    const user = await createUser(c.env.DB, {
      id: generateUlid(),
      tenantId: tenant.id,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    })

    return c.json({ ok: true, data: { user } }, 201)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE constraint failed: users.email')) {
      return c.json({ ok: false, error: { code: 'EMAIL_EXISTS', message: 'A user with this email already exists' } }, 409)
    }
    throw err
  }
})

// ── PUT /:id — Update a team member ────────────────────────────────

const updateMemberSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['VENDOR_ADMIN', 'MODERATOR', 'PRESENTER']).optional(),
  isActive: z.number().int().min(0).max(1).optional(),
})

adminUserRoutes.put('/:id', zValidator('json', updateMemberSchema), async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')
  const data = c.req.valid('json')

  const user = await findUserById(c.env.DB, id)
  if (!user || user.tenant_id !== tenant.id) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found in your organization' } }, 404)
  }

  await updateUser(c.env.DB, id, { ...data, tenantId: tenant.id })
  return c.json({ ok: true, data: { message: 'Team member updated successfully' } })
})

// ── POST /:id/reset-password — Reset team member's password ────────

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
})

adminUserRoutes.post('/:id/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')
  const { newPassword } = c.req.valid('json')

  const user = await findUserById(c.env.DB, id)
  if (!user || user.tenant_id !== tenant.id) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found in your organization' } }, 404)
  }

  const passwordHash = await hashPassword(newPassword)
  await updateUserPassword(c.env.DB, id, passwordHash)
  return c.json({ ok: true, data: { message: 'Password reset successfully' } })
})

// ── DELETE /:id — Remove team member ───────────────────────────────

adminUserRoutes.delete('/:id', async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')

  const user = await findUserById(c.env.DB, id)
  if (!user || user.tenant_id !== tenant.id) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found in your organization' } }, 404)
  }

  await deleteUser(c.env.DB, id)
  return c.json({ ok: true, data: { message: 'Team member removed' } })
})
