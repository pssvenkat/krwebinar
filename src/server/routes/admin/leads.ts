/**
 * Admin leads routes — Phase 11
 *
 * GET  /api/v1/admin/webinars/:id/leads         → list leads + summary
 * GET  /api/v1/admin/webinars/:id/leads/export  → CSV download
 */

import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types'
import { requireAuth } from '../../middleware/auth'
import {
  getLeadsForWebinar,
  getLeadsSummary,
  getLeadsCsvRows,
} from '../../lib/db'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// All leads routes require admin auth
app.use('*', requireAuth)

// ── GET /webinars/:id/leads ───────────────────────────────────────

app.get('/webinars/:id/leads', async (c) => {
  const tenant = c.get('tenant')
  const webinarId = c.req.param('id')

  const [{ leads, total }, summary] = await Promise.all([
    getLeadsForWebinar(c.env.DB, webinarId, tenant.id),
    getLeadsSummary(c.env.DB, webinarId, tenant.id),
  ])

  // Parse interests JSON for each lead
  const parsed = leads.map((l) => ({
    ...l,
    interests: (() => {
      try { return JSON.parse(l.interests) as string[] } catch { return [] }
    })(),
  }))

  return c.json({ ok: true, data: { leads: parsed, total, summary } })
})

// ── GET /webinars/:id/leads/export ───────────────────────────────

app.get('/webinars/:id/leads/export', async (c) => {
  const tenant = c.get('tenant')
  const webinarId = c.req.param('id')

  const rows = await getLeadsCsvRows(c.env.DB, webinarId, tenant.id)

  const q = (s: string) => `"${s.replace(/"/g, '""')}"`

  const header = 'Name,Email,Phone,Country,Rating,Interests,Suggestion,Contact Requested,Preferred Contact,Submitted At'
  const csv = [
    header,
    ...rows.map((r) => [
      q(r.name), q(r.email), q(r.phone), q(r.country),
      q(r.rating), q(r.interests), q(r.suggestion),
      q(r.contact_requested), q(r.preferred_contact), q(r.created_at),
    ].join(',')),
  ].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads_${webinarId}.csv"`,
    },
  })
})

export { app as leadsRoutes }
