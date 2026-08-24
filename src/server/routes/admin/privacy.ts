/**
 * Admin Privacy & DPDP Compliance Routes
 *
 * Routes for Tenant Admin to:
 * 1. View consent audit trail records (marketing, necessary, analytics, contact)
 * 2. Directly purge/erase personal data for any attendee/user under DPDP Act 2023
 * 3. View open DPDP erasure requests and approve (with automatic purge) or reject
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  listConsentRecords,
  countConsentRecords,
  purgeTenantUserData,
  listDpdpErasureRequests,
  processDpdpErasureRequest,
} from '../../lib/db'
import { requireAuth, requireRole } from '../../middleware/auth'
import type { Env, HonoVariables } from '../../types'

export const privacyAdminRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// Require authentication & admin role
privacyAdminRoutes.use('/*', requireAuth())
privacyAdminRoutes.use('/*', requireRole(['VENDOR_ADMIN', 'VENDOR_OWNER', 'PLATFORM_OWNER']))

// ── GET /consents ─────────────────────────────────────────────────

privacyAdminRoutes.get('/consents', async (c) => {
  const tenant = c.get('tenant')
  const db = c.env.DB

  const search = c.req.query('search') || undefined
  const consentType = c.req.query('consentType') || undefined
  const grantedParam = c.req.query('granted')
  const granted = grantedParam !== undefined && grantedParam !== '' ? parseInt(grantedParam, 10) : undefined

  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '50', 10)))
  const offset = (page - 1) * limit

  const [records, total] = await Promise.all([
    listConsentRecords(db, tenant.id, { search, consentType, granted, limit, offset }),
    countConsentRecords(db, tenant.id, { search, consentType, granted }),
  ])

  return c.json({
    ok: true,
    data: {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  })
})

// ── DELETE /purge-user ────────────────────────────────────────────

const purgeSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(5).max(20).optional(),
}).refine((data) => data.email || data.phone, {
  message: 'At least one of email or phone must be provided',
})

privacyAdminRoutes.delete('/purge-user', zValidator('json', purgeSchema), async (c) => {
  const tenant = c.get('tenant')
  const data = c.req.valid('json')

  try {
    const result = await purgeTenantUserData(c.env.DB, tenant.id, {
      email: data.email,
      phone: data.phone,
    })

    return c.json({
      ok: true,
      data: {
        message: `Successfully purged ${result.totalDeleted} personal data record(s).`,
        result,
      },
    })
  } catch (err: any) {
    return c.json({ ok: false, error: { code: 'PURGE_FAILED', message: err.message } }, 400)
  }
})

// ── GET /erasure-requests ─────────────────────────────────────────

privacyAdminRoutes.get('/erasure-requests', async (c) => {
  const tenant = c.get('tenant')
  const db = c.env.DB

  const status = c.req.query('status') || undefined
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '50', 10)))
  const offset = (page - 1) * limit

  const result = await listDpdpErasureRequests(db, tenant.id, { status, limit, offset })

  return c.json({
    ok: true,
    data: {
      requests: result.requests,
      pendingCount: result.pendingCount,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    },
  })
})

// ── POST /erasure-requests/:id/approve ────────────────────────────

const processSchema = z.object({
  notes: z.string().max(500).optional(),
})

privacyAdminRoutes.post('/erasure-requests/:id/approve', zValidator('json', processSchema.optional()), async (c) => {
  const tenant = c.get('tenant')
  const payload = c.get('jwtPayload')!
  const requestId = c.req.param('id')
  const body = c.req.valid('json') || {}

  try {
    const result = await processDpdpErasureRequest(
      c.env.DB,
      tenant.id,
      requestId,
      'APPROVE',
      payload.sub,
      body.notes,
    )

    return c.json({
      ok: true,
      data: {
        message: 'Erasure request approved and personal data purged successfully.',
        request: result.request,
        purgeResult: result.purgeResult,
      },
    })
  } catch (err: any) {
    return c.json({ ok: false, error: { code: 'PROCESS_FAILED', message: err.message } }, 400)
  }
})

// ── POST /erasure-requests/:id/reject ─────────────────────────────

privacyAdminRoutes.post('/erasure-requests/:id/reject', zValidator('json', processSchema.optional()), async (c) => {
  const tenant = c.get('tenant')
  const payload = c.get('jwtPayload')!
  const requestId = c.req.param('id')
  const body = c.req.valid('json') || {}

  try {
    const result = await processDpdpErasureRequest(
      c.env.DB,
      tenant.id,
      requestId,
      'REJECT',
      payload.sub,
      body.notes || 'Request rejected by administrator',
    )

    return c.json({
      ok: true,
      data: {
        message: 'Erasure request rejected.',
        request: result.request,
      },
    })
  } catch (err: any) {
    return c.json({ ok: false, error: { code: 'PROCESS_FAILED', message: err.message } }, 400)
  }
})
