/**
 * Analytics routes — Phase 9
 *
 * All routes require admin auth (requireAuth middleware).
 *
 * GET /api/v1/admin/analytics              → platform-level summary
 * GET /api/v1/admin/webinars/:id/analytics → per-webinar breakdown
 * GET /api/v1/admin/webinars/:id/export    → CSV download (registrations)
 */

import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types'
import { requireAuth } from '../../middleware/auth'
import {
  getPlatformAnalytics,
  getWebinarAnalytics,
  getRegistrationsCsvRows,
} from '../../lib/db'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

app.use('*', requireAuth())

// ── Platform analytics ────────────────────────────────────────────

app.get('/analytics', async (c) => {
  const tenant = c.get('tenant')
  const analytics = await getPlatformAnalytics(c.env.DB, tenant.id)
  return c.json({ ok: true, data: analytics })
})

// ── Per-webinar analytics ─────────────────────────────────────────

app.get('/webinars/:id/analytics', async (c) => {
  const tenant = c.get('tenant')
  const webinarId = c.req.param('id')

  const analytics = await getWebinarAnalytics(c.env.DB, webinarId, tenant.id)
  if (!analytics) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found' } }, 404)
  }

  return c.json({ ok: true, data: analytics })
})

// ── CSV export ────────────────────────────────────────────────────

app.get('/webinars/:id/export', async (c) => {
  const tenant = c.get('tenant')
  const webinarId = c.req.param('id')

  const rows = await getRegistrationsCsvRows(c.env.DB, webinarId, tenant.id)

  const header = 'Name,Email,Phone,Country,City,Attended,Registered At\n'
  const csvRows = rows.map((r) =>
    [r.name, r.email, r.phone, r.country, r.city, r.attended, r.registered_at]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = header + csvRows.join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registrations-${webinarId}.csv"`,
    },
  })
})

export { app as analyticsRoutes }
