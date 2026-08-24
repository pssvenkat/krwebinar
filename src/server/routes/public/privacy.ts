/**
 * Public Privacy & DPDP Erasure Request Routes
 *
 * Allows attendees to submit Right to be Forgotten / DPDP data erasure requests.
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createDpdpErasureRequest } from '../../lib/db'
import type { Env, HonoVariables } from '../../types'

export const privacyPublicRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

const publicErasureSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(5).max(20).optional().or(z.literal('')),
  reason: z.string().max(1000).optional(),
  cfTurnstileToken: z.string().optional(),
}).refine((data) => (data.email && data.email.trim() !== '') || (data.phone && data.phone.trim() !== ''), {
  message: 'Please provide at least your Email address or Phone number to process the deletion request',
})

privacyPublicRoutes.post('/erasure-request', zValidator('json', publicErasureSchema), async (c) => {
  const tenant = c.get('tenant')
  const data = c.req.valid('json')

  // Verify Turnstile if secret provided and in production
  if (c.env.ENVIRONMENT !== 'development' && c.env.TURNSTILE_SECRET_KEY && data.cfTurnstileToken) {
    const form = new FormData()
    form.append('secret', c.env.TURNSTILE_SECRET_KEY)
    form.append('response', data.cfTurnstileToken)
    const ip = c.req.header('cf-connecting-ip') ?? ''
    if (ip) form.append('remoteip', ip)

    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const tsJson = (await tsRes.json()) as { success: boolean }
    if (!tsJson.success) {
      return c.json({ ok: false, error: { code: 'BOT_DETECTED', message: 'Security verification failed' } }, 400)
    }
  }

  const reqRecord = await createDpdpErasureRequest(c.env.DB, tenant.id, {
    email: data.email || null,
    phone: data.phone || null,
    reason: data.reason || 'Right to be Forgotten request under DPDP Act 2023',
    ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
    userAgent: c.req.header('user-agent') || null,
  })

  return c.json({
    ok: true,
    data: {
      message: 'Your DPDP data erasure request has been submitted successfully.',
      requestId: reqRecord.id,
      status: reqRecord.status,
      submittedAt: reqRecord.created_at,
    },
  }, 201)
})
