/**
 * D1 typed query helpers
 *
 * Thin wrappers over D1Database that:
 *  1. Always require tenant_id in tenant-scoped queries
 *  2. Return typed results
 *  3. Generate ULIDs for new rows
 */

import type { D1Database } from '@cloudflare/workers-types'
import type {
  DbTenant,
  DbUser,
  DbWebinar,
  DbTenantBranding,
  DbTenantSettings,
} from '../types'

// ── ULID generation (no npm dep) ──────────────────────────────────

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ENCODING_LEN = ENCODING.length
const TIME_LEN = 10
const RANDOM_LEN = 16

export function generateULID(): string {
  const seed = new Uint8Array(RANDOM_LEN)
  crypto.getRandomValues(seed)

  let t = Date.now()
  let id = ''

  for (let i = TIME_LEN; i > 0; i--) {
    id = ENCODING[t % ENCODING_LEN] + id
    t = Math.floor(t / ENCODING_LEN)
  }

  for (let i = 0; i < RANDOM_LEN; i++) {
    id += ENCODING[seed[i] % ENCODING_LEN]
  }

  return id
}

// ── Tenant queries ────────────────────────────────────────────────

export async function findTenantBySlug(db: D1Database, slug: string): Promise<DbTenant | null> {
  const result = await db
    .prepare('SELECT * FROM tenants WHERE slug = ? AND status != ? LIMIT 1')
    .bind(slug, 'suspended')
    .first<DbTenant>()
  return result ?? null
}

export async function findTenantByDomain(db: D1Database, domain: string): Promise<DbTenant | null> {
  // In Phase 5, custom_domain column will be added. For now, domain maps to slug.
  const slug = domain.split('.')[0]
  return findTenantBySlug(db, slug)
}

export async function getTenantBranding(db: D1Database, tenantId: string): Promise<DbTenantBranding | null> {
  const result = await db
    .prepare('SELECT * FROM tenant_branding WHERE tenant_id = ? LIMIT 1')
    .bind(tenantId)
    .first<DbTenantBranding>()
  return result ?? null
}

export async function getTenantSettings(db: D1Database, tenantId: string): Promise<DbTenantSettings | null> {
  const result = await db
    .prepare('SELECT * FROM tenant_settings WHERE tenant_id = ? LIMIT 1')
    .bind(tenantId)
    .first<DbTenantSettings>()
  return result ?? null
}

// ── User queries ──────────────────────────────────────────────────

export async function findUserByEmail(
  db: D1Database,
  tenantId: string | null,
  email: string,
): Promise<DbUser | null> {
  const result = await db
    .prepare(
      `SELECT * FROM users
       WHERE email = ?
         AND (tenant_id = ? OR (tenant_id IS NULL AND ? IS NULL))
         AND is_active = 1
       LIMIT 1`,
    )
    .bind(email, tenantId, tenantId)
    .first<DbUser>()
  return result ?? null
}

export async function findUserById(db: D1Database, id: string): Promise<DbUser | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1')
    .bind(id)
    .first<DbUser>()
  return result ?? null
}

// ── Webinar queries ───────────────────────────────────────────────

export async function listWebinars(
  db: D1Database,
  tenantId: string,
  options: { status?: string; limit?: number; offset?: number } = {},
): Promise<DbWebinar[]> {
  const { status, limit = 20, offset = 0 } = options
  const query = status
    ? 'SELECT * FROM webinars WHERE tenant_id = ? AND status = ? ORDER BY start_date DESC, start_time DESC LIMIT ? OFFSET ?'
    : 'SELECT * FROM webinars WHERE tenant_id = ? ORDER BY start_date DESC, start_time DESC LIMIT ? OFFSET ?'

  const stmt = status
    ? db.prepare(query).bind(tenantId, status, limit, offset)
    : db.prepare(query).bind(tenantId, limit, offset)

  const result = await stmt.all<DbWebinar>()
  return result.results ?? []
}

export async function countWebinars(db: D1Database, tenantId: string, status?: string): Promise<number> {
  const query = status
    ? 'SELECT COUNT(*) as count FROM webinars WHERE tenant_id = ? AND status = ?'
    : 'SELECT COUNT(*) as count FROM webinars WHERE tenant_id = ?'
  const stmt = status
    ? db.prepare(query).bind(tenantId, status)
    : db.prepare(query).bind(tenantId)
  const result = await stmt.first<{ count: number }>()
  return result?.count ?? 0
}

export async function getWebinarById(
  db: D1Database,
  tenantId: string,
  webinarId: string,
): Promise<DbWebinar | null> {
  const result = await db
    .prepare('SELECT * FROM webinars WHERE id = ? AND tenant_id = ? LIMIT 1')
    .bind(webinarId, tenantId)
    .first<DbWebinar>()
  return result ?? null
}

export async function createWebinar(
  db: D1Database,
  tenantId: string,
  userId: string,
  data: {
    title: string
    description?: string
    hostName?: string
    startDate: string
    startTime: string
    endTime: string
    timezone?: string
    youtubeVideoId?: string
    maxParticipants?: number
  },
): Promise<DbWebinar> {
  const id = generateULID()
  const now = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO webinars
       (id, tenant_id, title, description, host_name, start_date, start_time,
        end_time, timezone, youtube_video_id, max_participants, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, tenantId,
      data.title,
      data.description ?? null,
      data.hostName ?? '',
      data.startDate, data.startTime, data.endTime,
      data.timezone ?? 'Asia/Kolkata',
      data.youtubeVideoId ?? null,
      data.maxParticipants ?? 300,
      userId, now, now,
    )
    .run()

  return (await getWebinarById(db, tenantId, id))!
}

export async function updateWebinar(
  db: D1Database,
  tenantId: string,
  webinarId: string,
  data: Partial<{
    title: string
    description: string
    hostName: string
    startDate: string
    startTime: string
    endTime: string
    timezone: string
    youtubeVideoId: string
    status: string
    maxParticipants: number
    registrationOpen: boolean
  }>,
): Promise<DbWebinar | null> {
  const sets: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined)           { sets.push('title = ?');              values.push(data.title) }
  if (data.description !== undefined)     { sets.push('description = ?');        values.push(data.description) }
  if (data.hostName !== undefined)        { sets.push('host_name = ?');           values.push(data.hostName) }
  if (data.startDate !== undefined)       { sets.push('start_date = ?');          values.push(data.startDate) }
  if (data.startTime !== undefined)       { sets.push('start_time = ?');          values.push(data.startTime) }
  if (data.endTime !== undefined)         { sets.push('end_time = ?');            values.push(data.endTime) }
  if (data.timezone !== undefined)        { sets.push('timezone = ?');            values.push(data.timezone) }
  if (data.youtubeVideoId !== undefined)  { sets.push('youtube_video_id = ?');   values.push(data.youtubeVideoId) }
  if (data.status !== undefined)          { sets.push('status = ?');              values.push(data.status) }
  if (data.maxParticipants !== undefined) { sets.push('max_participants = ?');   values.push(data.maxParticipants) }
  if (data.registrationOpen !== undefined){ sets.push('registration_open = ?');  values.push(data.registrationOpen ? 1 : 0) }

  if (sets.length === 0) return getWebinarById(db, tenantId, webinarId)

  sets.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(webinarId, tenantId)

  await db
    .prepare(`UPDATE webinars SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`)
    .bind(...values)
    .run()

  return getWebinarById(db, tenantId, webinarId)
}

// ── Refresh token queries ─────────────────────────────────────────

export async function storeRefreshToken(
  db: D1Database,
  userId: string,
  tenantId: string | null,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  const id = generateULID()
  await db
    .prepare(
      'INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(id, userId, tenantId, tokenHash, expiresAt.toISOString())
    .run()
}

export async function verifyRefreshToken(
  db: D1Database,
  tokenHash: string,
): Promise<{ userId: string; tenantId: string | null } | null> {
  const result = await db
    .prepare(
      `SELECT user_id, tenant_id FROM refresh_tokens
       WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')
       LIMIT 1`,
    )
    .bind(tokenHash)
    .first<{ user_id: string; tenant_id: string | null }>()

  if (!result) return null
  return { userId: result.user_id, tenantId: result.tenant_id }
}

export async function revokeRefreshToken(db: D1Database, tokenHash: string): Promise<void> {
  await db
    .prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?')
    .bind(tokenHash)
    .run()
}
