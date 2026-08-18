/**
 * Cron scheduler — Phase 6
 *
 * Runs every 15 minutes via Cloudflare cron triggers.
 * Finds webinars starting in ≈30 minutes and dispatches reminder emails.
 *
 * Exported as `scheduled` — wired into the worker default export
 * alongside the Hono app fetch handler.
 */

import type { Env } from './types'
import { sendReminderEmails } from './lib/email'

interface WebinarRow {
  id: string
  tenant_id: string
  title: string
  start_date: string
  start_time: string
  end_time: string
  timezone: string
  host_name: string
  youtube_video_id: string | null
  status: string
  max_participants: number
  registration_open: number
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface RegistrationRow {
  id: string
  tenant_id: string
  webinar_id: string
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  state_province: string | null
  city: string | null
  access_token: string
  attended: number
  registered_at: string
  attended_at: string | null
}

interface TenantRow {
  id: string
  slug: string
  name: string
}

/**
 * Find PUBLISHED webinars whose start falls between `fromNow` and `toNow` minutes from now.
 * We query by start_date + start_time stored in YYYY-MM-DD + HH:MM format.
 * Since D1 doesn't support datetime arithmetic natively, we do a range in UTC.
 */
async function getWebinarsStartingSoon(db: D1Database, windowMinutes = 35): Promise<WebinarRow[]> {
  const now = new Date()
  const from = new Date(now.getTime() + 25 * 60 * 1000) // 25 min from now
  const to = new Date(now.getTime() + windowMinutes * 60 * 1000) // 35 min from now

  // Store as "YYYY-MM-DD HH:MM" combined for comparison
  const fromStr = from.toISOString().slice(0, 16).replace('T', ' ')
  const toStr = to.toISOString().slice(0, 16).replace('T', ' ')

  const result = await db
    .prepare(
      `SELECT * FROM webinars
       WHERE status = 'PUBLISHED'
         AND (start_date || ' ' || start_time) >= ?
         AND (start_date || ' ' || start_time) <= ?`,
    )
    .bind(fromStr, toStr)
    .all<WebinarRow>()

  return result.results
}

async function getRegistrationsForWebinar(db: D1Database, webinarId: string): Promise<RegistrationRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM webinar_registrations
       WHERE webinar_id = ? AND COALESCE(email_opt_out, 0) = 0`,
    )
    .bind(webinarId)
    .all<RegistrationRow>()

  return result.results
}

async function getTenantForWebinar(db: D1Database, tenantId: string): Promise<TenantRow | null> {
  return db
    .prepare('SELECT id, slug, name FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first<TenantRow>()
}

/**
 * Main scheduled handler — called by Cloudflare cron every 15 minutes.
 */
export async function scheduled(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  try {
    const webinars = await getWebinarsStartingSoon(env.DB)

    if (webinars.length === 0) {
      console.warn('[Cron] No webinars starting soon — nothing to do')
      return
    }

    console.warn(`[Cron] Sending reminders for ${webinars.length} webinar(s)`)

    for (const webinar of webinars) {
      const [registrations, tenant] = await Promise.all([
        getRegistrationsForWebinar(env.DB, webinar.id),
        getTenantForWebinar(env.DB, webinar.tenant_id),
      ])

      if (!tenant) {
        console.warn(`[Cron] Tenant not found for webinar ${webinar.id}`)
        continue
      }

      if (registrations.length === 0) {
        console.warn(`[Cron] No registrations for webinar ${webinar.id}`)
        continue
      }

      console.warn(`[Cron] Sending ${registrations.length} reminders for "${webinar.title}"`)

      await sendReminderEmails(env, registrations, webinar, tenant)
    }
  } catch (err) {
    console.error('[Cron] Unhandled error in scheduled handler', err)
  }
}
