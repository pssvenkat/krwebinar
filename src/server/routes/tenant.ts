/**
 * Public Tenant Route
 *
 * GET /api/v1/tenant
 *
 * Returns public tenant branding + settings. No auth required.
 * Used by the frontend to hydrate theme tokens for any vendor.
 */

import { Hono } from 'hono'
import { getTenantBranding, getTenantSettings } from '../lib/db'
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
            timezone: settings.timezone,
            locale: settings.locale,
            supportEmail: settings.support_email,
            registrationFields: JSON.parse(settings.registration_fields || '[]') as string[],
            consentPurposes: JSON.parse(settings.consent_purposes || '[]') as string[],
          }
        : null,
    },
  })
})
