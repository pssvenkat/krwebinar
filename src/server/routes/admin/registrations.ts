/**
 * Admin registrations route
 * GET /api/v1/admin/webinars/:id/registrations
 */

import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth'
import type { Env, HonoVariables } from '../../types'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

app.get('/:id/registrations', requireAuth(), async (c) => {
  const tenant = c.get('tenant')
  const webinarId = c.req.param('id')
  const db = c.env.DB

  const rows = await db
    .prepare(
      `SELECT id, name, email, phone_e164, country_code, city,
              access_token, attended, registered_at, attended_at
       FROM webinar_registrations
       WHERE webinar_id = ? AND tenant_id = ?
       ORDER BY registered_at DESC`,
    )
    .bind(webinarId, tenant.id)
    .all()

  const total = rows.results.length

  return c.json({
    ok: true,
    data: {
      registrations: rows.results,
      total,
    },
  })
})

export { app as registrationAdminRoutes }
