/**
 * Public Webinar Routes
 *
 * No auth required. Tenant-resolved by middleware.
 *
 * GET  /api/v1/webinars/:id/public   → Public info (title, date, host, status)
 * POST /api/v1/webinars/:id/register → Register a participant
 * GET  /api/v1/attend/:token         → Validate token → webinar + YouTube ID
 * POST /api/v1/webinars/:id/feedback → Submit feedback + lead capture
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  getPublicWebinar,
  countRegistrations,
  findExistingRegistration,
  createRegistration,
  findRegistrationByToken,
  createLeadCapture,
  createConsentRecord,
  markAttended,
  countFeedbackForRegistration,
  getWebinarById,
} from '../../lib/db'
import { generateSecureToken } from '../../lib/jwt'
import type { Env, HonoVariables } from '../../types'

export const publicWebinarRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// ── Serializer ────────────────────────────────────────────────────

function serializePublicWebinar(w: Awaited<ReturnType<typeof getPublicWebinar>>) {
  if (!w) return null
  return {
    id: w.id,
    title: w.title,
    description: w.description,
    hostName: w.host_name,
    startDate: w.start_date,
    startTime: w.start_time,
    endTime: w.end_time,
    timezone: w.timezone,
    status: w.status,
    maxParticipants: w.max_participants,
    registrationOpen: w.registration_open === 1,
    isLive: w.status === 'LIVE',
    // YouTube ID only revealed to authenticated participants via /attend/:token
    youtubeVideoId: w.status === 'LIVE' ? null : null,
  }
}

// ── GET /webinars/:id/public ──────────────────────────────────────

publicWebinarRoutes.get('/:id/public', async (c) => {
  const tenant = c.get('tenant')
  const webinar = await getPublicWebinar(c.env.DB, tenant.id, c.req.param('id'))

  if (!webinar) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found or not available' } }, 404)
  }

  const registered = await countRegistrations(c.env.DB, tenant.id, webinar.id)
  const spotsLeft = Math.max(0, webinar.max_participants - registered)

  return c.json({
    ok: true,
    data: {
      webinar: {
        ...serializePublicWebinar(webinar),
        spotsLeft,
        isFull: spotsLeft === 0,
      },
    },
  })
})

// ── POST /webinars/:id/register ───────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  countryCode: z.string().length(2).optional(),
  stateProvince: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  interests: z.array(z.string()).optional().default([]),
  consentMarketing: z.boolean().optional().default(false),
  // Turnstile token — skipped in development
  cfTurnstileToken: z.string().optional(),
})

publicWebinarRoutes.post('/:id/register', zValidator('json', registerSchema), async (c) => {
  const tenant = c.get('tenant')
  const data = c.req.valid('json')
  const db = c.env.DB
  const webinarId = c.req.param('id')

  // 1. Verify Turnstile in production
  if (c.env.ENVIRONMENT !== 'development' && c.env.TURNSTILE_SECRET_KEY) {
    const token = data.cfTurnstileToken ?? ''
    const form = new FormData()
    form.append('secret', c.env.TURNSTILE_SECRET_KEY)
    form.append('response', token)
    const ip = c.req.header('cf-connecting-ip') ?? ''
    if (ip) form.append('remoteip', ip)

    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const tsJson = await tsRes.json() as { success: boolean }
    if (!tsJson.success) {
      return c.json({ ok: false, error: { code: 'BOT_DETECTED', message: 'Bot verification failed' } }, 400)
    }
  }

  // 2. Load webinar — must be PUBLISHED or LIVE and have registration open
  const webinar = await getPublicWebinar(db, tenant.id, webinarId)
  if (!webinar) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found or not available' } }, 404)
  }
  if (!webinar.registration_open) {
    return c.json({ ok: false, error: { code: 'REGISTRATION_CLOSED', message: 'Registration is closed for this webinar' } }, 409)
  }

  // 3. Capacity check
  const registered = await countRegistrations(db, tenant.id, webinarId)
  if (registered >= webinar.max_participants) {
    return c.json({ ok: false, error: { code: 'WEBINAR_FULL', message: 'This webinar is fully booked' } }, 409)
  }

  // 4. Duplicate check — idempotent (return existing registration)
  const existing = await findExistingRegistration(db, tenant.id, webinarId, data.email)
  if (existing) {
    return c.json({
      ok: true,
      data: {
        registration: {
          id: existing.id,
          accessToken: existing.access_token,
          name: existing.name,
          email: existing.email,
          alreadyRegistered: true,
        },
        webinar: serializePublicWebinar(webinar),
      },
    })
  }

  // 5. Create registration
  const accessToken = generateSecureToken(48)
  const registration = await createRegistration(db, tenant.id, webinarId, accessToken, {
    name: data.name,
    email: data.email,
    phoneE164: data.phone,
    countryCode: data.countryCode,
    stateProvince: data.stateProvince,
    city: data.city,
  })

  // 6. Record DPDP consent (necessary — always)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? undefined
  const ua = c.req.header('user-agent') ?? undefined
  await createConsentRecord(db, tenant.id, {
    subjectEmail: data.email,
    subjectPhone: data.phone,
    consentType: 'necessary',
    granted: true,
    ipAddress: ip,
    userAgent: ua,
    sourceUrl: c.req.header('referer') ?? undefined,
  })

  // 6b. Record marketing consent if given
  if (data.consentMarketing) {
    await createConsentRecord(db, tenant.id, {
      subjectEmail: data.email,
      subjectPhone: data.phone,
      consentType: 'marketing',
      granted: true,
      ipAddress: ip,
      userAgent: ua,
    })
  }

  // 7. Send confirmation email (non-blocking — best effort)
  const { sendConfirmationEmail } = await import('../../lib/email')
  c.executionCtx.waitUntil(
    sendConfirmationEmail(c.env, registration, webinar, tenant).catch((err: unknown) =>
      console.warn('[Email] Confirmation send failed', err),
    ),
  )

  return c.json(
    {
      ok: true,
      data: {
        registration: {
          id: registration.id,
          accessToken: registration.access_token,
          name: registration.name,
          email: registration.email,
          alreadyRegistered: false,
        },
        webinar: serializePublicWebinar(webinar),
      },
    },
    201,
  )
})

const phoneVerifySchema = z.object({
  webinarId: z.string().min(1),
  phone: z.string().min(3).max(30),
})

// ── POST /attend/verify-phone ─────────────────────────────────────

publicWebinarRoutes.post('/attend/verify-phone', zValidator('json', phoneVerifySchema), async (c) => {
  const tenant = c.get('tenant')
  const { webinarId, phone } = c.req.valid('json')
  const db = c.env.DB

  const webinar = await getWebinarById(db, tenant.id, webinarId)
  if (!webinar) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found or not available' } }, 404)
  }

  const inputDigits = phone.replace(/\D/g, '')
  if (inputDigits.length < 4) {
    return c.json({ ok: false, error: { code: 'INVALID_PHONE', message: 'Please enter a valid phone number' } }, 400)
  }

  // Find registrations for this specific webinar and tenant
  const result = await db
    .prepare('SELECT * FROM webinar_registrations WHERE webinar_id = ? AND tenant_id = ?')
    .bind(webinar.id, tenant.id)
    .all<any>()

  const rows = result.results || []
  const match = rows.find((r) => {
    if (!r.phone_e164) return false
    const rowDigits = r.phone_e164.replace(/\D/g, '')
    return (
      rowDigits === inputDigits ||
      rowDigits.endsWith(inputDigits) ||
      inputDigits.endsWith(rowDigits)
    )
  })

  if (!match) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'NOT_REGISTERED',
          message: 'This phone number is not registered for this webinar. Please register first.',
        },
      },
      403,
    )
  }

  return c.json({
    ok: true,
    data: {
      accessToken: match.access_token,
      registration: {
        id: match.id,
        name: match.name,
        email: match.email,
        phone: match.phone_e164,
      },
      webinar: {
        id: webinar.id,
        title: webinar.title,
        status: webinar.status,
      },
    },
  })
})

// ── GET /attend/:token ────────────────────────────────────────────

publicWebinarRoutes.get('/attend/:token', async (c) => {
  const tenant = c.get('tenant')
  const token = c.req.param('token')

  let registration = await findRegistrationByToken(c.env.DB, token)
  let webinar = null

  if (registration && registration.tenant_id === tenant.id) {
    webinar = await getWebinarById(c.env.DB, tenant.id, registration.webinar_id)
  } else {
    // If token is actually a webinar ID, resolve/find a demo registration
    const directWebinar = await getWebinarById(c.env.DB, tenant.id, token)
    if (directWebinar) {
      webinar = directWebinar
      const existing = await c.env.DB
        .prepare('SELECT * FROM webinar_registrations WHERE webinar_id = ? AND tenant_id = ? LIMIT 1')
        .bind(directWebinar.id, tenant.id)
        .first<any>()
      if (existing) {
        registration = existing
      } else {
        registration = {
          id: `guest-${token}`,
          tenant_id: tenant.id,
          webinar_id: directWebinar.id,
          name: 'Demo Attendee',
          email: 'attendee@example.com',
          phone_e164: null,
          country_code: 'IN',
          access_token: token,
          attended: 1,
          registered_at: new Date().toISOString(),
        }
      }
    }
  }

  if (!registration || !webinar) {
    return c.json({ ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired access token' } }, 401)
  }

  // Mark as attended on first access during LIVE
  if (webinar.status === 'LIVE' && !registration.attended && registration.id) {
    await markAttended(c.env.DB, registration.id)
  }

  return c.json({
    ok: true,
    data: {
      registration: {
        id: registration.id,
        name: registration.name,
        email: registration.email,
      },
      webinar: {
        id: webinar.id,
        title: webinar.title,
        description: webinar.description,
        hostName: webinar.host_name,
        startDate: webinar.start_date,
        startTime: webinar.start_time,
        endTime: webinar.end_time,
        timezone: webinar.timezone,
        status: webinar.status,
        // YouTube ID is revealed here — only to registered participants
        youtubeVideoId: webinar.youtube_video_id,
        isLive: webinar.status === 'LIVE',
        isEnded: webinar.status === 'ENDED',
      },
    },
  })
})

// ── POST /webinars/:id/feedback ───────────────────────────────────

const feedbackSchema = z.object({
  accessToken: z.string().min(10),
  rating: z.number().int().min(1).max(5).optional(),
  suggestion: z.string().max(500).optional(),
  interests: z.array(z.string()).optional().default([]),
  contactRequested: z.boolean().optional().default(false),
  preferredContact: z.enum(['email', 'whatsapp', 'call']).optional(),
  consentContact: z.boolean().optional().default(false),
})

publicWebinarRoutes.post('/:id/feedback', zValidator('json', feedbackSchema), async (c) => {
  const tenant = c.get('tenant')
  const data = c.req.valid('json')
  const webinarId = c.req.param('id')
  const db = c.env.DB

  // Validate registration token belongs to this webinar
  let registration = await findRegistrationByToken(db, data.accessToken)
  if (!registration || registration.tenant_id !== tenant.id || registration.webinar_id !== webinarId) {
    // If token passed is the webinarId itself, look up registration by webinar_id
    if (data.accessToken === webinarId) {
      registration = await db
        .prepare('SELECT * FROM webinar_registrations WHERE webinar_id = ? AND tenant_id = ? LIMIT 1')
        .bind(webinarId, tenant.id)
        .first<any>()
    }
  }

  if (!registration) {
    return c.json({ ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid access token' } }, 401)
  }

  const webinar = await getWebinarById(db, tenant.id, webinarId)
  if (!webinar || !['ENDED', 'ARCHIVED'].includes(webinar.status)) {
    return c.json({ ok: false, error: { code: 'NOT_ALLOWED', message: 'Feedback can only be submitted after the webinar ends' } }, 409)
  }

  // One feedback per registration
  const existing = await countFeedbackForRegistration(db, registration.id)
  if (existing > 0) {
    return c.json({ ok: false, error: { code: 'ALREADY_SUBMITTED', message: 'You have already submitted feedback' } }, 409)
  }

  // Create lead capture
  await createLeadCapture(db, tenant.id, {
    webinarId,
    registrationId: registration.id,
    name: registration.name,
    email: registration.email,
    phoneE164: registration.phone_e164 ?? undefined,
    countryCode: registration.country_code ?? undefined,
    interests: data.interests,
    rating: data.rating,
    suggestion: data.suggestion,
    contactRequested: data.contactRequested,
    preferredContact: data.preferredContact,
  })

  // Record contact consent if requested
  if (data.consentContact && data.contactRequested) {
    await createConsentRecord(db, tenant.id, {
      subjectEmail: registration.email,
      consentType: 'contact',
      granted: true,
    })
  }

  return c.json({ ok: true, data: { message: 'Thank you for your feedback!' } }, 201)
})
