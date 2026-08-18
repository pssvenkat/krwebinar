/**
 * Email sender — Phase 6
 *
 * Sends via Cloudflare Email Workers (MailChannels).
 * Falls back to a console.warn stub in development so local dev
 * never needs real SMTP credentials.
 *
 * Production: set wrangler secret put MAILCHANNEL_API_KEY (if using auth)
 * or rely on the Cloudflare ↔ MailChannels server-level trust relationship.
 *
 * All send functions:
 *   1. Build the template
 *   2. Resolve the FROM address (tenant support_email or platform default)
 *   3. POST to the MailChannels /tx/v1/send endpoint
 *   4. Log success/failure — never throw (email is best-effort)
 */

import type { Env, DbWebinar, DbRegistration, DbTenant } from '../types'
import {
  buildConfirmationEmail,
  buildLiveNotificationEmail,
  buildReminderEmail,
  buildFeedbackRequestEmail,
  buildVendorAlertEmail,
} from './email-templates'

// ── MailChannels types ────────────────────────────────────────────

interface MCAddress { email: string; name?: string }

interface MCPayload {
  personalizations: Array<{ to: MCAddress[]; dkim_domain?: string; dkim_selector?: string; dkim_private_key?: string }>
  from: MCAddress
  reply_to?: MCAddress
  subject: string
  content: Array<{ type: 'text/plain' | 'text/html'; value: string }>
}

// ── Core send ─────────────────────────────────────────────────────

async function sendEmail(env: Env, payload: MCPayload): Promise<void> {
  if (env.ENVIRONMENT === 'development') {
    console.warn('[Email stub]', {
      to: payload.personalizations[0]?.to,
      subject: payload.subject,
    })
    return
  }

  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text()
      console.warn('[Email] MailChannels error', res.status, body)
    }
  } catch (err) {
    console.warn('[Email] Send failed', err)
  }
}

function fromAddress(tenant: Pick<DbTenant, 'name'>, supportEmail?: string | null): MCAddress {
  return {
    email: supportEmail ?? `noreply@krwebinar.com`,
    name: `${tenant.name} Webinars`,
  }
}

function platformUrl(env: Env): string {
  return env.ENVIRONMENT === 'production'
    ? `https://krwebinar.com`
    : `http://localhost:5173`
}

// ── 1. Registration confirmation ──────────────────────────────────

export async function sendConfirmationEmail(
  env: Env,
  registration: DbRegistration,
  webinar: DbWebinar,
  tenant: Pick<DbTenant, 'id' | 'name' | 'slug'>,
  supportEmail?: string | null,
): Promise<void> {
  const base = platformUrl(env)
  const attendUrl = `${base}/w/${registration.access_token}`
  const unsubUrl = `${base}/api/v1/unsubscribe/${registration.access_token}`

  const email = buildConfirmationEmail({
    attendeeName: registration.name,
    webinarTitle: webinar.title,
    webinarDate: webinar.start_date,
    webinarTime: webinar.start_time,
    webinarTimezone: webinar.timezone,
    hostName: webinar.host_name,
    attendUrl,
    unsubscribeUrl: unsubUrl,
    brandName: tenant.name,
  })

  await sendEmail(env, {
    personalizations: [{ to: [{ email: registration.email, name: registration.name }] }],
    from: fromAddress(tenant, supportEmail),
    subject: email.subject,
    content: [
      { type: 'text/plain', value: email.text },
      { type: 'text/html', value: email.html },
    ],
  })
}

// ── 2. Going-live notification (bulk) ─────────────────────────────

export async function sendLiveNotifications(
  env: Env,
  registrations: DbRegistration[],
  webinar: DbWebinar,
  tenant: Pick<DbTenant, 'id' | 'name' | 'slug'>,
  supportEmail?: string | null,
): Promise<void> {
  const base = platformUrl(env)
  const from = fromAddress(tenant, supportEmail)

  // Send individually — MailChannels free tier; could batch with personalizations[]
  const sends = registrations
    .filter((r) => r.attended === 0) // only those not already attending
    .map((r) => {
      const attendUrl = `${base}/w/${r.access_token}`
      const unsubUrl = `${base}/api/v1/unsubscribe/${r.access_token}`
      const email = buildLiveNotificationEmail({
        attendeeName: r.name,
        webinarTitle: webinar.title,
        attendUrl,
        unsubscribeUrl: unsubUrl,
        brandName: tenant.name,
      })
      return sendEmail(env, {
        personalizations: [{ to: [{ email: r.email, name: r.name }] }],
        from,
        subject: email.subject,
        content: [
          { type: 'text/plain', value: email.text },
          { type: 'text/html', value: email.html },
        ],
      })
    })

  await Promise.allSettled(sends)
}

// ── 3. 30-minute reminder (bulk, called from cron) ────────────────

export async function sendReminderEmails(
  env: Env,
  registrations: DbRegistration[],
  webinar: DbWebinar,
  tenant: Pick<DbTenant, 'id' | 'name' | 'slug'>,
  supportEmail?: string | null,
): Promise<void> {
  const base = platformUrl(env)
  const from = fromAddress(tenant, supportEmail)

  const sends = registrations.map((r) => {
    const attendUrl = `${base}/w/${r.access_token}`
    const unsubUrl = `${base}/api/v1/unsubscribe/${r.access_token}`
    const email = buildReminderEmail({
      attendeeName: r.name,
      webinarTitle: webinar.title,
      webinarDate: webinar.start_date,
      webinarTime: webinar.start_time,
      webinarTimezone: webinar.timezone,
      attendUrl,
      unsubscribeUrl: unsubUrl,
      brandName: tenant.name,
    })
    return sendEmail(env, {
      personalizations: [{ to: [{ email: r.email, name: r.name }] }],
      from,
      subject: email.subject,
      content: [
        { type: 'text/plain', value: email.text },
        { type: 'text/html', value: email.html },
      ],
    })
  })

  await Promise.allSettled(sends)
}

// ── 4. Feedback request (bulk, after webinar ends) ────────────────

export async function sendFeedbackRequests(
  env: Env,
  registrations: DbRegistration[],
  webinar: DbWebinar,
  tenant: Pick<DbTenant, 'id' | 'name' | 'slug'>,
  supportEmail?: string | null,
): Promise<void> {
  const base = platformUrl(env)
  const from = fromAddress(tenant, supportEmail)

  // Only send to those who actually attended
  const sends = registrations
    .filter((r) => r.attended === 1)
    .map((r) => {
      const feedbackUrl = `${base}/w/${r.access_token}/feedback`
      const unsubUrl = `${base}/api/v1/unsubscribe/${r.access_token}`
      const email = buildFeedbackRequestEmail({
        attendeeName: r.name,
        webinarTitle: webinar.title,
        feedbackUrl,
        unsubscribeUrl: unsubUrl,
        brandName: tenant.name,
      })
      return sendEmail(env, {
        personalizations: [{ to: [{ email: r.email, name: r.name }] }],
        from,
        subject: email.subject,
        content: [
          { type: 'text/plain', value: email.text },
          { type: 'text/html', value: email.html },
        ],
      })
    })

  await Promise.allSettled(sends)
}

// ── 5. Vendor admin alert — new registration ──────────────────────

export async function sendVendorAlert(
  env: Env,
  registration: DbRegistration,
  webinar: DbWebinar,
  tenant: Pick<DbTenant, 'id' | 'name' | 'slug'>,
  adminEmail: string,
  totalRegistrations: number,
): Promise<void> {
  const base = platformUrl(env)
  const adminUrl = `${base}/admin/webinars/${webinar.id}`

  const email = buildVendorAlertEmail({
    adminEmail,
    attendeeName: registration.name,
    attendeeEmail: registration.email,
    attendeeCountry: registration.country_code,
    webinarTitle: webinar.title,
    webinarDate: webinar.start_date,
    webinarTime: webinar.start_time,
    webinarTimezone: webinar.timezone,
    totalRegistrations,
    brandName: tenant.name,
    adminUrl,
  })

  await sendEmail(env, {
    personalizations: [{ to: [{ email: adminEmail }] }],
    from: fromAddress(tenant),
    subject: email.subject,
    content: [
      { type: 'text/plain', value: email.text },
      { type: 'text/html', value: email.html },
    ],
  })
}
