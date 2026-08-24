/**
 * Trainer Profile Admin & Public Routes
 *
 * GET  /api/v1/admin/trainer   → get trainer profile (auth required)
 * PUT  /api/v1/admin/trainer   → update trainer profile (auth required)
 * GET  /api/v1/public/trainer  → public trainer profile for landing page
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, HonoVariables } from '../../types'
import { requireAuth } from '../../middleware/auth'
import { getTrainerProfile, upsertTrainerProfile } from '../../lib/db'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

const trainerSchema = z.object({
  name:                    z.string().min(2).max(150),
  title:                   z.string().max(200).optional(),
  bio:                     z.string().max(2000).optional(),
  avatar_url:              z.string().nullable().optional(),
  highlights:              z.array(z.string().max(200)).optional(),
  experience_years:        z.string().max(100).optional(),
  whatsapp_community_url:  z.string().url().nullable().optional().or(z.string().max(0)),
  social_links:            z.record(z.string()).optional(),
}).passthrough()

// ── GET /api/v1/admin/trainer (Vendor Admin) ──────────────────────
app.get('/trainer', requireAuth(), async (c) => {
  const tenant = c.get('tenant')
  const profile = await getTrainerProfile(c.env.DB, tenant.id)
  return c.json({ ok: true, data: profile })
})

// ── PUT /api/v1/admin/trainer (Vendor Admin) ──────────────────────
app.put('/trainer', requireAuth(), zValidator('json', trainerSchema), async (c) => {
  const tenant = c.get('tenant')
  const patch = c.req.valid('json')
  const updated = await upsertTrainerProfile(c.env.DB, tenant.id, {
    ...patch,
    whatsapp_community_url: patch.whatsapp_community_url ? patch.whatsapp_community_url : null,
  })
  return c.json({ ok: true, data: updated })
})

// ── GET /api/v1/public/trainer (No Auth) ───────────────────────────
app.get('/public/trainer', async (c) => {
  const tenant = c.get('tenant')
  const profile = await getTrainerProfile(c.env.DB, tenant.id)
  return c.json({ ok: true, data: profile })
})

export { app as trainerRoutes }
