/**
 * Platform Users Management Routes — Superadmin (/api/platform/users)
 *
 * All routes require PLATFORM_OWNER role.
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, HonoVariables } from '../../types'
import { requireAuth, requireRole } from '../../middleware/auth'
import {
  listAllPlatformUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  findUserById,
} from '../../lib/db'
import { hashPassword } from '../../lib/password'

export const platformUserRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

platformUserRoutes.use('*', requireAuth())
platformUserRoutes.use('*', requireRole(['PLATFORM_OWNER']))

// ── GET / — List all platform & tenant users ───────────────────────

platformUserRoutes.get('/', async (c) => {
  const users = await listAllPlatformUsers(c.env.DB)
  return c.json({ ok: true, data: { users } })
})

// ── POST / — Create / Invite a User ────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['PLATFORM_OWNER', 'VENDOR_OWNER', 'VENDOR_ADMIN', 'MODERATOR', 'PRESENTER']),
  tenantId: z.string().nullable().optional(),
})

platformUserRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const { ulid } = await import('ulid')
  const passwordHash = await hashPassword(data.password)

  try {
    const user = await createUser(c.env.DB, {
      id: ulid(),
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      tenantId: data.role === 'PLATFORM_OWNER' ? null : (data.tenantId ?? null),
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

// ── PUT /:id — Update User ─────────────────────────────────────────

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['PLATFORM_OWNER', 'VENDOR_OWNER', 'VENDOR_ADMIN', 'MODERATOR', 'PRESENTER']).optional(),
  tenantId: z.string().nullable().optional(),
  isActive: z.number().int().min(0).max(1).optional(),
})

platformUserRoutes.put('/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const user = await findUserById(c.env.DB, id)
  if (!user) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  await updateUser(c.env.DB, id, data)
  return c.json({ ok: true, data: { message: 'User updated successfully' } })
})

// ── POST /:id/reset-password — Reset User Password ─────────────────

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
})

platformUserRoutes.post('/:id/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const id = c.req.param('id')
  const { newPassword } = c.req.valid('json')
  const passwordHash = await hashPassword(newPassword)

  await updateUserPassword(c.env.DB, id, passwordHash)
  return c.json({ ok: true, data: { message: 'Password reset successfully' } })
})

// ── DELETE /:id — Delete User ──────────────────────────────────────

platformUserRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await deleteUser(c.env.DB, id)
  return c.json({ ok: true, data: { message: 'User deleted successfully' } })
})
