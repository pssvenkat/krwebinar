/**
 * Landing Page Settings & CMS Routes
 *
 * GET  /api/v1/admin/landing         → get landing page CMS settings (auth required)
 * PUT  /api/v1/admin/landing         → update landing page CMS settings (auth required)
 * GET  /api/v1/public/landing-config → public landing page CMS config
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, HonoVariables } from '../../types'
import { requireAuth } from '../../middleware/auth'
import { getLandingPageSettings, upsertLandingPageSettings } from '../../lib/db'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

const benefitSchema = z.object({
  icon: z.string().max(10),
  num: z.string().max(5),
  title: z.string().max(150),
  desc: z.string().max(500),
})

const testimonialSchema = z.object({
  initials: z.string().max(5),
  name: z.string().max(100),
  location: z.string().max(150),
  rating: z.number().int().min(1).max(5),
  quote: z.string().max(1000),
})

const faqSchema = z.object({
  q: z.string().max(250),
  a: z.string().max(1500),
})

const landingSettingsSchema = z.object({
  fallback_redirect_url:    z.string().url().max(500).optional(),
  fallback_redirect_secs:   z.number().int().min(1).max(60).optional(),
  fallback_title:           z.string().max(200).optional(),
  fallback_message:         z.string().max(1000).optional(),
  hero_headline_override:   z.string().max(300).nullable().optional(),
  hero_subheading_override: z.string().max(600).nullable().optional(),
  hero_badge_text:          z.string().max(100).optional(),
  hero_social_proof_text:   z.string().max(200).optional(),
  hero_primary_cta_text:    z.string().max(100).optional(),
  hero_secondary_cta_text:  z.string().max(100).optional(),
  benefits:                 z.array(benefitSchema).optional(),
  testimonials:             z.array(testimonialSchema).optional(),
  faqs:                     z.array(faqSchema).optional(),
}).passthrough()

// ── GET /api/v1/admin/landing (Admin) ──────────────────────────────
app.get('/landing', requireAuth(), async (c) => {
  const tenant = c.get('tenant')
  const settings = await getLandingPageSettings(c.env.DB, tenant.id)
  return c.json({ ok: true, data: settings })
})

// ── PUT /api/v1/admin/landing (Admin) ──────────────────────────────
app.put('/landing', requireAuth(), zValidator('json', landingSettingsSchema), async (c) => {
  const tenant = c.get('tenant')
  const patch = c.req.valid('json')
  const updated = await upsertLandingPageSettings(c.env.DB, tenant.id, patch)
  return c.json({ ok: true, data: updated })
})

// ── GET /api/v1/public/landing-config (No Auth) ────────────────────
app.get('/public/landing-config', async (c) => {
  const tenant = c.get('tenant')
  const settings = await getLandingPageSettings(c.env.DB, tenant.id)
  return c.json({ ok: true, data: settings })
})

export { app as landingAdminRoutes }
