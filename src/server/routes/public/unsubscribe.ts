/**
 * Unsubscribe route — Phase 6
 *
 * GET  /api/v1/unsubscribe/:token  — one-click unsubscribe (email link)
 * POST /api/v1/unsubscribe/:token  — programmatic unsubscribe
 *
 * Uses the access_token (already unique per registration) as the
 * unsubscribe identifier so no extra token is needed.
 *
 * DPDP / GDPR: sets email_opt_out = 1 on the registration row.
 * The opt-out is immutable — a re-registration creates a new row.
 */

import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

async function handleUnsubscribe(token: string, db: D1Database): Promise<{ found: boolean }> {
  // Check row exists
  const row = await db
    .prepare('SELECT id, email_opt_out FROM webinar_registrations WHERE access_token = ?')
    .bind(token)
    .first<{ id: string; email_opt_out: number | null }>()

  if (!row) return { found: false }

  // Idempotent — only update if not already opted out
  if (!row.email_opt_out) {
    await db
      .prepare('UPDATE webinar_registrations SET email_opt_out = 1, updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), row.id)
      .run()
  }

  return { found: true }
}

// GET — renders a simple HTML confirmation page (linked from emails)
app.get('/:token', async (c) => {
  const token = c.req.param('token')
  const { found } = await handleUnsubscribe(token, c.env.DB)

  if (!found) {
    return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem;">
      <h2>Link not found</h2>
      <p>This unsubscribe link is invalid or has expired.</p>
    </body></html>`, 404)
  }

  return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#f5f5f5;">
    <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:3rem;border:1px solid #e5e7eb;">
      <p style="font-size:3rem;margin:0 0 1rem;">✅</p>
      <h2 style="margin:0 0 0.5rem;">Unsubscribed</h2>
      <p style="color:#6b7280;">You will no longer receive emails from this webinar series.</p>
    </div>
  </body></html>`)
})

// POST — for programmatic access (e.g. list-unsubscribe header)
app.post('/:token', async (c) => {
  const token = c.req.param('token')
  const { found } = await handleUnsubscribe(token, c.env.DB)

  if (!found) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Token not found' } }, 404)
  }

  return c.json({ ok: true, data: { unsubscribed: true } })
})

export { app as unsubscribeRoutes }
