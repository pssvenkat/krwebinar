/**
 * Public Tenant Route
 *
 * GET /api/v1/tenant
 *
 * Returns public tenant branding + settings. No auth required.
 * Used by the frontend to hydrate theme tokens for any vendor.
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getTenantBranding, getTenantSettings, upsertSettings } from '../lib/db'
import { requireAuth } from '../middleware/auth'
import type { Env, HonoVariables } from '../types'

export const tenantRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

tenantRoutes.get('/', async (c) => {
  const tenant = c.get('tenant')
  const db = c.env.DB

  const [branding, settings] = await Promise.all([
    getTenantBranding(db, tenant.id),
    getTenantSettings(db, tenant.id),
  ])

  return c.json({
    ok: true,
    data: {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        planTier: tenant.planTier,
      },
      branding: branding
        ? {
            logoUrl: branding.logo_url,
            faviconUrl: branding.favicon_url,
            colors: {
              primary: branding.primary_color,
              secondary: branding.secondary_color,
              accent: branding.accent_color,
              background: branding.background_color,
              surface: branding.surface_color,
              text: branding.text_color,
              muted: branding.muted_color,
              border: branding.border_color,
            },
            fonts: {
              heading: branding.font_heading,
              body: branding.font_body,
            },
            borderRadiusBase: branding.border_radius_base,
            customCss: branding.custom_css,
          }
        : null,
      settings: settings
        ? {
            timezone: settings.timezone ?? 'Asia/Kolkata',
            locale: settings.locale ?? 'en-IN',
            supportEmail: settings.support_email ?? null,
            registrationFields: JSON.parse(settings.registration_fields || '[]') as string[],
            consentPurposes: JSON.parse(settings.consent_purposes || '[]') as string[],
          }
        : null,
    },
  })
})

const updateProfileSchema = z.object({
  supportEmail: z.string().email('Must be a valid email address').optional(),
  timezone: z.string().max(100).optional(),
  locale: z.string().max(20).optional(),
})

tenantRoutes.put('/', requireAuth(), zValidator('json', updateProfileSchema), async (c) => {
  const tenant = c.get('tenant')
  const { supportEmail, timezone, locale } = c.req.valid('json')

  await upsertSettings(c.env.DB, tenant.id, {
    support_email: supportEmail,
    timezone,
    locale,
  })

  return c.json({ ok: true, message: 'Profile updated successfully' })
})
