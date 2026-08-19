/**
 * WebSocket upgrade routes — Phase 8
 *
 * GET /api/v1/ws/webinar/:id        → attendee WebSocket (validated by access_token query param)
 * GET /api/v1/ws/webinar/:id/host   → host WebSocket (validated by Bearer JWT)
 * GET /api/v1/ws/webinar/:id/state  → HTTP viewer count (for non-WS polling fallback)
 *
 * The worker validates the caller, then proxies the upgrade request to the
 * WebinarRoom Durable Object. The DO's name is deterministic:
 *   `{tenantId}:{webinarId}`
 * so all participants of the same webinar land on the same DO instance.
 */

import { Hono } from 'hono'
import type { Env, HonoVariables } from '../../types'
import { findRegistrationByToken, getWebinarById } from '../../lib/db'
import { verifyJWT } from '../../lib/jwt'

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

/** Get (or create) the Durable Object stub for a webinar */
function getDoStub(env: Env, tenantId: string, webinarId: string): DurableObjectStub {
  const name = `${tenantId}:${webinarId}`
  const id = env.WEBINAR_ROOM.idFromName(name)
  return env.WEBINAR_ROOM.get(id)
}

// ── Attendee WebSocket ────────────────────────────────────────────

app.get('/:id/ws', async (c) => {
  const webinarId = c.req.param('id')
  const accessToken = c.req.query('token')
  const tenant = c.get('tenant')

  if (!accessToken) {
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Access token required' } }, 401)
  }

  // Validate token
  const registration = await findRegistrationByToken(c.env.DB, accessToken)
  if (!registration || registration.tenant_id !== tenant.id || registration.webinar_id !== webinarId) {
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401)
  }

  // Ensure webinar exists + is PUBLISHED or LIVE
  const webinar = await getWebinarById(c.env.DB, webinarId, tenant.id)
  if (!webinar) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found' } }, 404)
  }
  if (!['PUBLISHED', 'LIVE'].includes(webinar.status)) {
    return c.json({ ok: false, error: { code: 'NOT_LIVE', message: 'Webinar is not live or published' } }, 409)
  }

  // Proxy to Durable Object
  const stub = getDoStub(c.env, tenant.id, webinarId)
  const params = new URLSearchParams({
    sessionId: registration.id,
    name: registration.name,
    tenantId: tenant.id,
    webinarId,
    hostName: webinar.host_name || 'Host',
    isHost: '0',
  })

  const doUrl = `https://do/ws?${params.toString()}`
  const doReq = new Request(doUrl, {
    headers: c.req.raw.headers,
    method: 'GET',
  })

  return stub.fetch(doReq)
})

// ── Host WebSocket ────────────────────────────────────────────────

app.get('/:id/ws/host', async (c) => {
  const webinarId = c.req.param('id')
  const tenant = c.get('tenant')

  // Validate Bearer JWT from header or query param (for browser WebSocket)
  const authHeader = c.req.header('Authorization') ?? ''
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    token = c.req.query('token') ?? null
  }

  if (!token) {
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Access token required' } }, 401)
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET).catch(() => null)
  if (
    !payload ||
    (payload.tenantId && payload.role !== 'PLATFORM_OWNER' && payload.tenantId !== tenant.id)
  ) {
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401)
  }

  // Ensure webinar exists
  const webinar = await getWebinarById(c.env.DB, webinarId, tenant.id)
  if (!webinar) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Webinar not found' } }, 404)
  }

  const stub = getDoStub(c.env, tenant.id, webinarId)
  const hostDisplayName = webinar.host_name || payload.email.split('@')[0]
  const params = new URLSearchParams({
    sessionId: `host:${payload.sub}`,
    name: hostDisplayName,
    tenantId: tenant.id,
    webinarId,
    hostName: hostDisplayName,
    isHost: '1',
  })

  const doUrl = `https://do/ws?${params.toString()}`
  const doReq = new Request(doUrl, {
    headers: c.req.raw.headers,
    method: 'GET',
  })

  return stub.fetch(doReq)
})

// ── Viewer count (HTTP polling fallback) ──────────────────────────

app.get('/:id/state', async (c) => {
  const webinarId = c.req.param('id')
  const tenant = c.get('tenant')

  const stub = getDoStub(c.env, tenant.id, webinarId)
  const doRes = await stub.fetch(`https://do/state`)
  const state = await doRes.json() as { participantCount: number; isEnded: boolean }

  return c.json({ ok: true, data: state })
})

export { app as wsRoutes }
