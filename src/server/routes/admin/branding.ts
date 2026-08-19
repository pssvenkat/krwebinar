/**
 * Branding + Settings admin routes — Phase 10
 *
 * GET  /api/v1/admin/branding         → get current branding
 * PUT  /api/v1/admin/branding         → update branding
 * GET  /api/v1/admin/settings         → get current settings
 * PUT  /api/v1/admin/settings         → update settings
 * GET  /api/v1/public/branding        → public branding (no auth)
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, HonoVariables } from '../../types'
import { requireAuth } from '../../middleware/auth'
import {
  getBranding, upsertBranding,
  getSettings, upsertSettings,
  getPublicBranding,
} from '../../lib/db'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// ── Validation schemas ────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color e.g. #4f46e5')

const brandingSchema = z.object({
  primary_color:    hexColor.optional(),
  secondary_color:  hexColor.optional(),
  accent_color:     hexColor.optional(),
  background_color: hexColor.optional(),
  surface_color:    hexColor.optional(),
  text_color:       hexColor.optional(),
  muted_color:      hexColor.optional(),
  border_color:     hexColor.optional(),
  success_color:    hexColor.optional(),
  warning_color:    hexColor.optional(),
  error_color:      hexColor.optional(),
  font_heading:     z.string().max(200).optional(),
  font_body:        z.string().max(200).optional(),
  logo_url:         z.string().max(2_000_000).nullable().optional(),
  favicon_url:      z.string().max(2_000_000).nullable().optional(),
}).strict()

const settingsSchema = z.object({
  max_webinars:                    z.number().int().min(1).max(1000).optional(),
  max_participants:                z.number().int().min(1).max(10000).optional(),
  chat_rate_limit_messages:        z.number().int().min(1).max(100).optional(),
  chat_rate_limit_window_seconds:  z.number().int().min(5).max(3600).optional(),
}).strict()

// ── Admin branding routes (auth required) ─────────────────────────

app.get('/branding', requireAuth(), async (c) => {
  const tenant = c.get('tenant')
  const branding = await getBranding(c.env.DB, tenant.id)
  return c.json({ ok: true, data: branding })
})

app.put('/branding', requireAuth(), zValidator('json', brandingSchema), async (c) => {
  const tenant = c.get('tenant')
  const patch = c.req.valid('json')
  await upsertBranding(c.env.DB, tenant.id, patch)
  const updated = await getBranding(c.env.DB, tenant.id)
  return c.json({ ok: true, data: updated })
})

// ── Admin settings routes (auth required) ─────────────────────────

app.get('/settings', requireAuth(), async (c) => {
  const tenant = c.get('tenant')
  const settings = await getSettings(c.env.DB, tenant.id)
  return c.json({ ok: true, data: settings })
})

app.put('/settings', requireAuth(), zValidator('json', settingsSchema), async (c) => {
  const tenant = c.get('tenant')
  const patch = c.req.valid('json')
  await upsertSettings(c.env.DB, tenant.id, patch)
  const updated = await getSettings(c.env.DB, tenant.id)
  return c.json({ ok: true, data: updated })
})

// ── Public branding (no auth — used by RegisterPage + AttendPage) ──

app.get('/public/branding', async (c) => {
  const tenant = c.get('tenant')
  const branding = await getPublicBranding(c.env.DB, tenant.id)
  return c.json({ ok: true, data: branding })
})

export { app as brandingRoutes }
