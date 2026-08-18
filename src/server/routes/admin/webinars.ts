/**
 * Admin Webinar Routes — tenant-scoped CRUD
 *
 * All routes require: requireAuth() + requireRole(['VENDOR_ADMIN','VENDOR_STAFF'])
 * All DB queries are tenant-isolated via tenant_id from middleware.
 *
 * GET    /api/v1/admin/webinars          → list with pagination + status filter
 * POST   /api/v1/admin/webinars          → create
 * GET    /api/v1/admin/webinars/:id      → get one
 * PUT    /api/v1/admin/webinars/:id      → update
 * DELETE /api/v1/admin/webinars/:id      → soft-delete (archive)
 * POST   /api/v1/admin/webinars/:id/publish  → DRAFT → PUBLISHED
 * POST   /api/v1/admin/webinars/:id/go-live  → PUBLISHED → LIVE
 * POST   /api/v1/admin/webinars/:id/end      → LIVE → ENDED
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { listWebinars, countWebinars, getWebinarById, createWebinar, updateWebinar } from '../../lib/db'
import { requireAuth } from '../../middleware/auth'
import { requireRole } from '../../middleware/auth'
import type { Env, HonoVariables, DbWebinar } from '../../types'

export const webinarAdminRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// Apply auth to all routes
webinarAdminRoutes.use('/*', requireAuth())
webinarAdminRoutes.use('/*', requireRole(['VENDOR_ADMIN', 'VENDOR_STAFF', 'PLATFORM_OWNER']))

// ── Serializer ────────────────────────────────────────────────────

function serializeWebinar(w: DbWebinar) {
  return {
    id: w.id,
    title: w.title,
    description: w.description,
    hostName: w.host_name,
    startDate: w.start_date,
    startTime: w.start_time,
    endTime: w.end_time,
    timezone: w.timezone,
    youtubeVideoId: w.youtube_video_id,
    status: w.status,
    maxParticipants: w.max_participants,
    registrationOpen: w.registration_open === 1,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }
}

// ── Validation schemas ────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  hostName: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  timezone: z.string().max(50).optional(),
  youtubeVideoId: z.string().max(20).optional(),
  maxParticipants: z.number().int().min(1).max(10000).optional(),
})

const updateSchema = createSchema.partial().extend({
  registrationOpen: z.boolean().optional(),
})

// ── GET /webinars ─────────────────────────────────────────────────

webinarAdminRoutes.get('/', async (c) => {
  const tenant = c.get('tenant')
  const db = c.env.DB

  const status = c.req.query('status') || undefined
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10)))
  const offset = (page - 1) * limit

  const [webinars, total] = await Promise.all([
    listWebinars(db, tenant.id, { status, limit, offset }),
    countWebinars(db, tenant.id, status),
  ])

  return c.json({
    ok: true,
    data: {
      webinars: webinars.map(serializeWebinar),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  })
})

// ── POST /webinars ────────────────────────────────────────────────

webinarAdminRoutes.post('/', zValidator('json', createSchema), async (c) => {
  const tenant = c.get('tenant')
  const payload = c.get('jwtPayload')!
  const data = c.req.valid('json')

  const webinar = await createWebinar(c.env.DB, tenant.id, payload.sub, data)
  return c.json({ ok: true, data: { webinar: serializeWebinar(webinar) } }, 201)
})

// ── GET /webinars/:id ─────────────────────────────────────────────

webinarAdminRoutes.get('/:id', async (c) => {
  const tenant = c.get('tenant')
  const webinar = await getWebinarById(c.env.DB, tenant.id, c.req.param('id'))

  if (!webinar) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found' } }, 404)
  }

  return c.json({ ok: true, data: { webinar: serializeWebinar(webinar) } })
})

// ── PUT /webinars/:id ─────────────────────────────────────────────

webinarAdminRoutes.put('/:id', zValidator('json', updateSchema), async (c) => {
  const tenant = c.get('tenant')
  const existing = await getWebinarById(c.env.DB, tenant.id, c.req.param('id'))

  if (!existing) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found' } }, 404)
  }

  // Cannot edit a LIVE or ENDED webinar
  if (['LIVE', 'ENDED', 'ARCHIVED'].includes(existing.status)) {
    return c.json(
      { ok: false, error: { code: 'STATUS_CONFLICT', message: `Cannot edit a ${existing.status} webinar` } },
      409,
    )
  }

  const updated = await updateWebinar(c.env.DB, tenant.id, c.req.param('id'), c.req.valid('json'))
  return c.json({ ok: true, data: { webinar: serializeWebinar(updated!) } })
})

// ── DELETE (archive) /webinars/:id ───────────────────────────────

webinarAdminRoutes.delete('/:id', requireRole(['VENDOR_ADMIN']), async (c) => {
  const tenant = c.get('tenant')
  const existing = await getWebinarById(c.env.DB, tenant.id, c.req.param('id'))

  if (!existing) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found' } }, 404)
  }

  if (existing.status === 'LIVE') {
    return c.json(
      { ok: false, error: { code: 'STATUS_CONFLICT', message: 'Cannot delete a live webinar. End it first.' } },
      409,
    )
  }

  await updateWebinar(c.env.DB, tenant.id, c.req.param('id'), { status: 'ARCHIVED' })
  return c.json({ ok: true, data: { message: 'Webinar archived' } })
})

// ── Status transition helpers ─────────────────────────────────────

const TRANSITIONS: Record<string, { from: string; to: string; adminOnly: boolean }> = {
  publish:  { from: 'DRAFT',     to: 'PUBLISHED', adminOnly: false },
  'go-live':{ from: 'PUBLISHED', to: 'LIVE',      adminOnly: false },
  end:      { from: 'LIVE',      to: 'ENDED',     adminOnly: false },
}

for (const [action, { from, to, adminOnly }] of Object.entries(TRANSITIONS)) {
  const handlers = adminOnly ? [requireRole(['VENDOR_ADMIN'])] : []
  webinarAdminRoutes.post(`/:id/${action}`, ...handlers, async (c) => {
    const tenant = c.get('tenant')
    const existing = await getWebinarById(c.env.DB, tenant.id, c.req.param('id'))

    if (!existing) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found' } }, 404)
    }

    if (existing.status !== from) {
      return c.json(
        { ok: false, error: { code: 'STATUS_CONFLICT', message: `Webinar must be ${from} to perform this action` } },
        409,
      )
    }

    const updated = await updateWebinar(c.env.DB, tenant.id, c.req.param('id'), { status: to })
    return c.json({ ok: true, data: { webinar: serializeWebinar(updated!) } })
  })
}
