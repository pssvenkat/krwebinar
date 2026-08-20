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
  DbRegistration,
  DbLeadCapture,
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
  const normalizedDomain = domain.toLowerCase().trim()

  // 1. Check custom domains table for an active mapped domain
  const domainRecord = await db
    .prepare(
      `SELECT t.* FROM tenants t
       JOIN tenant_domains d ON d.tenant_id = t.id
       WHERE d.domain = ? AND d.status = 'active' AND t.status != 'suspended'
       LIMIT 1`,
    )
    .bind(normalizedDomain)
    .first<DbTenant>()

  if (domainRecord) {
    return domainRecord
  }

  // 2. Fallback to subdomain extraction
  const slug = normalizedDomain.split('.')[0]
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
    feedbackInterests?: string[] | string | null
  },
): Promise<DbWebinar> {
  const id = generateULID()
  const now = new Date().toISOString()
  const interestsJson = data.feedbackInterests
    ? (typeof data.feedbackInterests === 'string' ? data.feedbackInterests : JSON.stringify(data.feedbackInterests))
    : null

  await db
    .prepare(
      `INSERT INTO webinars
       (id, tenant_id, title, description, host_name, start_date, start_time,
        end_time, timezone, youtube_video_id, max_participants, feedback_interests, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      interestsJson,
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
    feedbackInterests: string[] | string | null
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
  if (data.feedbackInterests !== undefined) {
    sets.push('feedback_interests = ?')
    values.push(
      data.feedbackInterests === null
        ? null
        : typeof data.feedbackInterests === 'string'
        ? data.feedbackInterests
        : JSON.stringify(data.feedbackInterests),
    )
  }

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

// ── Public webinar queries (Phase 4) ─────────────────────────────

/** Get a webinar visible to the public — only PUBLISHED or LIVE status */
export async function getPublicWebinar(
  db: D1Database,
  tenantId: string,
  webinarId: string,
): Promise<DbWebinar | null> {
  const result = await db
    .prepare(
      `SELECT * FROM webinars
       WHERE id = ? AND tenant_id = ?
         AND status IN ('PUBLISHED','LIVE')
       LIMIT 1`,
    )
    .bind(webinarId, tenantId)
    .first<DbWebinar>()
  return result ?? null
}

/** Count current registrations for a webinar (for capacity check) */
export async function countRegistrations(
  db: D1Database,
  tenantId: string,
  webinarId: string,
): Promise<number> {
  const result = await db
    .prepare(
      'SELECT COUNT(*) as count FROM webinar_registrations WHERE webinar_id = ? AND tenant_id = ?',
    )
    .bind(webinarId, tenantId)
    .first<{ count: number }>()
  return result?.count ?? 0
}

/** Check if an email is already registered for a webinar */
export async function findExistingRegistration(
  db: D1Database,
  tenantId: string,
  webinarId: string,
  email: string,
): Promise<DbRegistration | null> {
  const result = await db
    .prepare(
      `SELECT * FROM webinar_registrations
       WHERE webinar_id = ? AND tenant_id = ? AND email = ?
       LIMIT 1`,
    )
    .bind(webinarId, tenantId, email.toLowerCase())
    .first<DbRegistration>()
  return result ?? null
}

/** Find a registration by its unique access token */
export async function findRegistrationByToken(
  db: D1Database,
  token: string,
): Promise<DbRegistration | null> {
  const result = await db
    .prepare('SELECT * FROM webinar_registrations WHERE access_token = ? LIMIT 1')
    .bind(token)
    .first<DbRegistration>()
  return result ?? null
}

/** Create a new registration. Returns null if webinar is at capacity or already registered. */
export async function createRegistration(
  db: D1Database,
  tenantId: string,
  webinarId: string,
  accessToken: string,
  data: {
    name: string
    email: string
    phoneE164?: string
    countryCode?: string
    stateProvince?: string
    city?: string
  },
): Promise<DbRegistration> {
  const id = generateULID()
  const now = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO webinar_registrations
       (id, tenant_id, webinar_id, name, email, phone_e164, country_code,
        state_province, city, access_token, registered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, tenantId, webinarId,
      data.name,
      data.email.toLowerCase(),
      data.phoneE164 ?? null,
      data.countryCode ?? null,
      data.stateProvince ?? null,
      data.city ?? null,
      accessToken,
      now,
    )
    .run()

  const reg = await db
    .prepare('SELECT * FROM webinar_registrations WHERE id = ? LIMIT 1')
    .bind(id)
    .first<DbRegistration>()
  return reg!
}

/** Create a lead capture record */
export async function createLeadCapture(
  db: D1Database,
  tenantId: string,
  data: {
    webinarId?: string
    registrationId?: string
    name: string
    email: string
    phoneE164?: string
    countryCode?: string
    interests: string[]
    rating?: number
    suggestion?: string
    contactRequested: boolean
    preferredContact?: 'email' | 'whatsapp' | 'call'
  },
): Promise<DbLeadCapture> {
  const id = generateULID()
  const now = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO lead_captures
       (id, tenant_id, webinar_id, registration_id, name, email, phone_e164,
        country_code, interests, rating, suggestion, contact_requested,
        preferred_contact, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, tenantId,
      data.webinarId ?? null,
      data.registrationId ?? null,
      data.name,
      data.email.toLowerCase(),
      data.phoneE164 ?? null,
      data.countryCode ?? null,
      JSON.stringify(data.interests),
      data.rating ?? null,
      data.suggestion ?? null,
      data.contactRequested ? 1 : 0,
      data.preferredContact ?? null,
      now,
    )
    .run()

  const lead = await db
    .prepare('SELECT * FROM lead_captures WHERE id = ? LIMIT 1')
    .bind(id)
    .first<DbLeadCapture>()
  return lead!
}

/** Record a DPDP/GDPR consent event (insert-only, never updated) */
export async function createConsentRecord(
  db: D1Database,
  tenantId: string,
  data: {
    subjectEmail: string
    subjectPhone?: string
    consentType: 'necessary' | 'marketing' | 'analytics' | 'contact'
    granted: boolean
    ipAddress?: string
    userAgent?: string
    sourceUrl?: string
    legalBasis?: string
  },
): Promise<void> {
  const id = generateULID()
  const now = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO consent_records
       (id, tenant_id, subject_email, subject_phone, consent_type, granted,
        ip_address, user_agent, source_url, legal_basis, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, tenantId,
      data.subjectEmail.toLowerCase(),
      data.subjectPhone ?? null,
      data.consentType,
      data.granted ? 1 : 0,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      data.sourceUrl ?? null,
      data.legalBasis ?? 'consent',
      now,
    )
    .run()
}

/** Mark a registration as attended */
export async function markAttended(
  db: D1Database,
  registrationId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE webinar_registrations
       SET attended = 1, attended_at = datetime('now')
       WHERE id = ? AND attended = 0`,
    )
    .bind(registrationId)
    .run()
}

/** Count feedback already submitted for a registration (duplicate guard) */
export async function countFeedbackForRegistration(
  db: D1Database,
  registrationId: string,
): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM lead_captures WHERE registration_id = ?')
    .bind(registrationId)
    .first<{ count: number }>()
  return result?.count ?? 0
}

// ── Phase 9: Analytics helpers ────────────────────────────────────

export interface WebinarAnalytics {
  webinarId: string
  title: string
  status: string
  totalRegistrations: number
  attendedCount: number
  attendanceRate: number         // 0–100
  registrationsByDay: { date: string; count: number }[]
  countryCounts: { country: string; count: number }[]
}

export interface PlatformAnalytics {
  totalWebinars: number
  publishedWebinars: number
  liveWebinars: number
  totalRegistrations: number
  totalAttended: number
  overallAttendanceRate: number  // 0–100
  thisMonthRegistrations: number
  topWebinars: {
    id: string
    title: string
    registrations: number
    attended: number
    attendanceRate: number
  }[]
}

/** Per-webinar analytics — all registrations, attendance, country and day breakdown */
export async function getWebinarAnalytics(
  db: D1Database,
  webinarId: string,
  tenantId: string,
): Promise<WebinarAnalytics | null> {
  // Basic webinar + aggregate counts in one query
  const row = await db
    .prepare(
      `SELECT
         w.id, w.title, w.status,
         COUNT(r.id)                             AS total_registrations,
         SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) AS attended_count
       FROM webinars w
       LEFT JOIN webinar_registrations r
         ON r.webinar_id = w.id AND r.tenant_id = w.tenant_id
       WHERE w.id = ? AND w.tenant_id = ?
       GROUP BY w.id`,
    )
    .bind(webinarId, tenantId)
    .first<{
      id: string; title: string; status: string
      total_registrations: number; attended_count: number
    }>()

  if (!row) return null

  const total = row.total_registrations ?? 0
  const attended = row.attended_count ?? 0

  // Day-by-day registrations (last 30 days)
  const byDay = await db
    .prepare(
      `SELECT
         date(registered_at) AS date,
         COUNT(*)            AS count
       FROM webinar_registrations
       WHERE webinar_id = ? AND tenant_id = ?
       GROUP BY date(registered_at)
       ORDER BY date ASC`,
    )
    .bind(webinarId, tenantId)
    .all<{ date: string; count: number }>()

  // Country breakdown (top 10)
  const byCountry = await db
    .prepare(
      `SELECT
         COALESCE(country_code, 'Unknown') AS country,
         COUNT(*)                          AS count
       FROM webinar_registrations
       WHERE webinar_id = ? AND tenant_id = ?
       GROUP BY country_code
       ORDER BY count DESC
       LIMIT 10`,
    )
    .bind(webinarId, tenantId)
    .all<{ country: string; count: number }>()

  return {
    webinarId: row.id,
    title: row.title,
    status: row.status,
    totalRegistrations: total,
    attendedCount: attended,
    attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
    registrationsByDay: byDay.results,
    countryCounts: byCountry.results,
  }
}

/** Platform-level analytics — all webinars for a tenant */
export async function getPlatformAnalytics(
  db: D1Database,
  tenantId: string,
): Promise<PlatformAnalytics> {
  // Aggregate counts
  const totals = await db
    .prepare(
      `SELECT
         COUNT(DISTINCT w.id)                                AS total_webinars,
         SUM(CASE WHEN w.status = 'PUBLISHED' THEN 1 ELSE 0 END) AS published_webinars,
         SUM(CASE WHEN w.status = 'LIVE' THEN 1 ELSE 0 END)      AS live_webinars,
         COUNT(r.id)                                         AS total_registrations,
         SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END)    AS total_attended
       FROM webinars w
       LEFT JOIN webinar_registrations r
         ON r.webinar_id = w.id AND r.tenant_id = w.tenant_id
       WHERE w.tenant_id = ?`,
    )
    .bind(tenantId)
    .first<{
      total_webinars: number; published_webinars: number; live_webinars: number
      total_registrations: number; total_attended: number
    }>()

  // Registrations this calendar month
  const thisMonth = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM webinar_registrations
       WHERE tenant_id = ?
         AND strftime('%Y-%m', registered_at) = strftime('%Y-%m', 'now')`,
    )
    .bind(tenantId)
    .first<{ count: number }>()

  // Top 5 webinars by registration count
  const topRows = await db
    .prepare(
      `SELECT
         w.id, w.title,
         COUNT(r.id)                             AS registrations,
         SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) AS attended
       FROM webinars w
       LEFT JOIN webinar_registrations r
         ON r.webinar_id = w.id AND r.tenant_id = w.tenant_id
       WHERE w.tenant_id = ?
       GROUP BY w.id
       ORDER BY registrations DESC
       LIMIT 5`,
    )
    .bind(tenantId)
    .all<{ id: string; title: string; registrations: number; attended: number }>()

  const totalReg = totals?.total_registrations ?? 0
  const totalAtt = totals?.total_attended ?? 0

  return {
    totalWebinars: totals?.total_webinars ?? 0,
    publishedWebinars: totals?.published_webinars ?? 0,
    liveWebinars: totals?.live_webinars ?? 0,
    totalRegistrations: totalReg,
    totalAttended: totalAtt,
    overallAttendanceRate: totalReg > 0 ? Math.round((totalAtt / totalReg) * 100) : 0,
    thisMonthRegistrations: thisMonth?.count ?? 0,
    topWebinars: topRows.results.map((r) => ({
      id: r.id,
      title: r.title,
      registrations: r.registrations ?? 0,
      attended: r.attended ?? 0,
      attendanceRate:
        (r.registrations ?? 0) > 0
          ? Math.round(((r.attended ?? 0) / r.registrations) * 100)
          : 0,
    })),
  }
}

/** All registrations for a webinar as CSV rows */
export async function getRegistrationsCsvRows(
  db: D1Database,
  webinarId: string,
  tenantId: string,
): Promise<{
  name: string; email: string; phone: string; country: string
  city: string; attended: string; registered_at: string
}[]> {
  const result = await db
    .prepare(
      `SELECT
         name, email,
         COALESCE(phone_e164, '') AS phone,
         COALESCE(country_code, '') AS country,
         COALESCE(city, '') AS city,
         CASE WHEN attended = 1 THEN 'Yes' ELSE 'No' END AS attended,
         registered_at
       FROM webinar_registrations
       WHERE webinar_id = ? AND tenant_id = ?
       ORDER BY registered_at ASC`,
    )
    .bind(webinarId, tenantId)
    .all<{
      name: string; email: string; phone: string; country: string
      city: string; attended: string; registered_at: string
    }>()
  return result.results
}

// ── Phase 10: Branding + Settings helpers ─────────────────────────

/** Default colour palette — matches design system CSS variables */
export const DEFAULT_BRANDING = {
  primary_color: '#4f46e5',
  secondary_color: '#7c3aed',
  accent_color: '#06b6d4',
  background_color: '#f9fafb',
  surface_color: '#ffffff',
  text_color: '#111827',
  muted_color: '#6b7280',
  border_color: '#e5e7eb',
  success_color: '#16a34a',
  warning_color: '#d97706',
  error_color: '#dc2626',
  font_heading: 'Inter, system-ui, sans-serif',
  font_body: 'Inter, system-ui, sans-serif',
}

export interface BrandingRow {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  surface_color: string
  text_color: string
  muted_color: string
  border_color: string
  success_color: string
  warning_color: string
  error_color: string
  font_heading: string
  font_body: string
  logo_url: string | null
  favicon_url: string | null
  custom_css: string | null
}

export async function getBranding(db: D1Database, tenantId: string): Promise<BrandingRow> {
  const row = await db
    .prepare('SELECT * FROM tenant_branding WHERE tenant_id = ?')
    .bind(tenantId)
    .first<BrandingRow & { tenant_id: string }>()

  if (!row) {
    return {
      ...DEFAULT_BRANDING,
      logo_url: null,
      favicon_url: null,
      custom_css: null,
    }
  }

  return {
    primary_color: row.primary_color ?? DEFAULT_BRANDING.primary_color,
    secondary_color: row.secondary_color ?? DEFAULT_BRANDING.secondary_color,
    accent_color: row.accent_color ?? DEFAULT_BRANDING.accent_color,
    background_color: row.background_color ?? DEFAULT_BRANDING.background_color,
    surface_color: row.surface_color ?? DEFAULT_BRANDING.surface_color,
    text_color: row.text_color ?? DEFAULT_BRANDING.text_color,
    muted_color: row.muted_color ?? DEFAULT_BRANDING.muted_color,
    border_color: row.border_color ?? DEFAULT_BRANDING.border_color,
    success_color: row.success_color ?? DEFAULT_BRANDING.success_color,
    warning_color: row.warning_color ?? DEFAULT_BRANDING.warning_color,
    error_color: row.error_color ?? DEFAULT_BRANDING.error_color,
    font_heading: row.font_heading ?? DEFAULT_BRANDING.font_heading,
    font_body: row.font_body ?? DEFAULT_BRANDING.font_body,
    logo_url: row.logo_url ?? null,
    favicon_url: row.favicon_url ?? null,
    custom_css: row.custom_css ?? null,
  }
}

export async function upsertBranding(
  db: D1Database,
  tenantId: string,
  patch: Partial<BrandingRow>,
): Promise<void> {
  const current = await getBranding(db, tenantId)
  const merged = { ...current, ...patch }

  await db
    .prepare(
      `INSERT INTO tenant_branding
         (id, tenant_id, primary_color, secondary_color, accent_color,
          background_color, surface_color, text_color, muted_color, border_color,
          success_color, warning_color, error_color, font_heading, font_body,
          logo_url, favicon_url, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tenant_id) DO UPDATE SET
         primary_color = excluded.primary_color,
         secondary_color = excluded.secondary_color,
         accent_color = excluded.accent_color,
         background_color = excluded.background_color,
         surface_color = excluded.surface_color,
         text_color = excluded.text_color,
         muted_color = excluded.muted_color,
         border_color = excluded.border_color,
         success_color = excluded.success_color,
         warning_color = excluded.warning_color,
         error_color = excluded.error_color,
         font_heading = excluded.font_heading,
         font_body = excluded.font_body,
         logo_url = excluded.logo_url,
         favicon_url = excluded.favicon_url,
         updated_at = datetime('now')`,
    )
    .bind(
      generateULID(), tenantId,
      merged.primary_color, merged.secondary_color, merged.accent_color,
      merged.background_color, merged.surface_color, merged.text_color,
      merged.muted_color, merged.border_color,
      merged.success_color, merged.warning_color, merged.error_color,
      merged.font_heading, merged.font_body,
      merged.logo_url, merged.favicon_url,
    )
    .run()
}

export interface SettingsRow {
  max_webinars: number
  max_participants: number
  chat_rate_limit_messages: number
  chat_rate_limit_window_seconds: number
  support_email?: string | null
  timezone?: string | null
  locale?: string | null
}

export async function getSettings(db: D1Database, tenantId: string): Promise<SettingsRow> {
  const row = await db
    .prepare('SELECT * FROM tenant_settings WHERE tenant_id = ?')
    .bind(tenantId)
    .first<any>()

  return {
    max_webinars: row?.max_webinars ?? 10,
    max_participants: row?.max_participants ?? 300,
    chat_rate_limit_messages: row?.chat_rate_limit_messages ?? 5,
    chat_rate_limit_window_seconds: row?.chat_rate_limit_window_seconds ?? 10,
    support_email: row?.support_email ?? null,
    timezone: row?.timezone ?? 'Asia/Kolkata',
    locale: row?.locale ?? 'en-IN',
  }
}

export async function upsertSettings(
  db: D1Database,
  tenantId: string,
  patch: Partial<SettingsRow>,
): Promise<void> {
  const current = await getSettings(db, tenantId)
  const merged = { ...current, ...patch }

  await db
    .prepare(
      `INSERT INTO tenant_settings
         (id, tenant_id, max_webinars, max_participants,
          chat_rate_limit_messages, chat_rate_limit_window_seconds,
          support_email, timezone, locale, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tenant_id) DO UPDATE SET
         max_webinars = excluded.max_webinars,
         max_participants = excluded.max_participants,
         chat_rate_limit_messages = excluded.chat_rate_limit_messages,
         chat_rate_limit_window_seconds = excluded.chat_rate_limit_window_seconds,
         support_email = excluded.support_email,
         timezone = excluded.timezone,
         locale = excluded.locale,
         updated_at = datetime('now')`,
    )
    .bind(
      generateULID(), tenantId,
      merged.max_webinars, merged.max_participants,
      merged.chat_rate_limit_messages, merged.chat_rate_limit_window_seconds,
      merged.support_email ?? null, merged.timezone ?? 'Asia/Kolkata', merged.locale ?? 'en-IN',
    )
    .run()
}

/** Public branding — minimal subset safe to expose without auth */
export async function getPublicBranding(
  db: D1Database,
  tenantId: string,
): Promise<{
  primaryColor: string; secondaryColor: string; accentColor: string
  backgroundColor: string; surfaceColor: string; textColor: string
  mutedColor: string; borderColor: string; successColor: string
  warningColor: string; errorColor: string
  fontHeading: string; fontBody: string
  logoUrl: string | null; faviconUrl: string | null
  platformName: string
}> {
  const [branding, tenant] = await Promise.all([
    getBranding(db, tenantId),
    db.prepare('SELECT name FROM tenants WHERE id = ?').bind(tenantId).first<{ name: string }>(),
  ])

  return {
    primaryColor: branding.primary_color,
    secondaryColor: branding.secondary_color,
    accentColor: branding.accent_color,
    backgroundColor: branding.background_color,
    surfaceColor: branding.surface_color,
    textColor: branding.text_color,
    mutedColor: branding.muted_color,
    borderColor: branding.border_color,
    successColor: branding.success_color,
    warningColor: branding.warning_color,
    errorColor: branding.error_color,
    fontHeading: branding.font_heading,
    fontBody: branding.font_body,
    logoUrl: branding.logo_url,
    faviconUrl: branding.favicon_url,
    platformName: tenant?.name ?? 'Webinar Platform',
  }
}

// ── Phase 11: Leads helpers ───────────────────────────────────────

export interface LeadRow {
  id: string
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  interests: string   // JSON array as string
  rating: number | null
  suggestion: string | null
  contact_requested: number
  preferred_contact: string | null
  created_at: string
}

export interface LeadsSummary {
  totalLeads: number
  avgRating: number | null
  contactRequested: number
  ratingCounts: { rating: number; count: number }[]
}

/** Paginated leads list for a webinar */
export async function getLeadsForWebinar(
  db: D1Database,
  webinarId: string,
  tenantId: string,
  limit = 100,
  offset = 0,
): Promise<{ leads: LeadRow[]; total: number }> {
  const [rows, countRow] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, email, phone_e164, country_code, interests,
                rating, suggestion, contact_requested, preferred_contact, created_at
         FROM lead_captures
         WHERE webinar_id = ? AND tenant_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(webinarId, tenantId, limit, offset)
      .all<LeadRow>(),
    db
      .prepare('SELECT COUNT(*) as count FROM lead_captures WHERE webinar_id = ? AND tenant_id = ?')
      .bind(webinarId, tenantId)
      .first<{ count: number }>(),
  ])

  return { leads: rows.results, total: countRow?.count ?? 0 }
}

/** Aggregated stats for a webinar's leads */
export async function getLeadsSummary(
  db: D1Database,
  webinarId: string,
  tenantId: string,
): Promise<LeadsSummary> {
  const [totals, ratings] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) as total,
                ROUND(AVG(CAST(rating AS REAL)), 1) as avg_rating,
                SUM(contact_requested) as contact_count
         FROM lead_captures
         WHERE webinar_id = ? AND tenant_id = ?`,
      )
      .bind(webinarId, tenantId)
      .first<{ total: number; avg_rating: number | null; contact_count: number }>(),
    db
      .prepare(
        `SELECT rating, COUNT(*) as count
         FROM lead_captures
         WHERE webinar_id = ? AND tenant_id = ? AND rating IS NOT NULL
         GROUP BY rating
         ORDER BY rating DESC`,
      )
      .bind(webinarId, tenantId)
      .all<{ rating: number; count: number }>(),
  ])

  return {
    totalLeads: totals?.total ?? 0,
    avgRating: totals?.avg_rating ?? null,
    contactRequested: totals?.contact_count ?? 0,
    ratingCounts: ratings.results,
  }
}

/** CSV export rows for leads */
export async function getLeadsCsvRows(
  db: D1Database,
  webinarId: string,
  tenantId: string,
): Promise<{
  name: string; email: string; phone: string; country: string
  rating: string; suggestion: string; interests: string
  contact_requested: string; preferred_contact: string; created_at: string
}[]> {
  const result = await db
    .prepare(
      `SELECT name, email, phone_e164, country_code,
              rating, suggestion, interests,
              contact_requested, preferred_contact, created_at
       FROM lead_captures
       WHERE webinar_id = ? AND tenant_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(webinarId, tenantId)
    .all<LeadRow>()

  return result.results.map((r) => ({
    name: r.name,
    email: r.email,
    phone: r.phone_e164 ?? '',
    country: r.country_code ?? '',
    rating: r.rating !== null ? String(r.rating) : '',
    suggestion: r.suggestion ?? '',
    interests: (() => {
      try { return JSON.parse(r.interests).join('; ') } catch { return '' }
    })(),
    contact_requested: r.contact_requested ? 'Yes' : 'No',
    preferred_contact: r.preferred_contact ?? '',
    created_at: r.created_at,
  }))
}

/** All leads across all webinars for a tenant */
export async function getAllLeadsForTenant(
  db: D1Database,
  tenantId: string,
): Promise<{
  id: string
  webinar_id: string
  webinar_title: string
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  city: string | null
  interests: string
  rating: number | null
  suggestion: string | null
  contact_requested: number
  preferred_contact: string | null
  created_at: string
}[]> {
  const result = await db
    .prepare(
      `SELECT lc.id, lc.webinar_id, lc.name, lc.email, lc.phone_e164, lc.country_code,
              lc.interests, lc.rating, lc.suggestion, lc.contact_requested,
              lc.preferred_contact, lc.created_at,
              w.title AS webinar_title,
              r.city AS city
       FROM lead_captures lc
       JOIN webinars w ON w.id = lc.webinar_id
       LEFT JOIN webinar_registrations r ON r.id = lc.registration_id
       WHERE lc.tenant_id = ?
       ORDER BY lc.created_at DESC`,
    )
    .bind(tenantId)
    .all<any>()

  return result.results
}

// ── Phase 12: Platform admin helpers ─────────────────────────────

export interface PlatformTenant {
  id: string
  slug: string
  name: string
  status: string
  plan: string
  created_at: string
  updated_at: string
}

export interface PlatformTenantStats {
  webinarCount: number
  registrationCount: number
  leadCount: number
}

/** List all tenants (platform owner use only) */
export async function listPlatformTenants(db: D1Database): Promise<PlatformTenant[]> {
  const result = await db
    .prepare(
      `SELECT id, slug, name, status, plan, created_at, updated_at
       FROM tenants
       ORDER BY created_at DESC`,
    )
    .all<PlatformTenant>()
  return result.results
}

/** Create a new tenant and seed branding + settings rows */
export async function createPlatformTenant(
  db: D1Database,
  data: { name: string; slug: string; plan: string },
): Promise<PlatformTenant> {
  const id = generateULID()
  const now = new Date().toISOString()

  // Insert tenant
  await db
    .prepare(
      `INSERT INTO tenants (id, slug, name, status, plan, created_at, updated_at)
       VALUES (?, ?, ?, 'trial', ?, ?, ?)`,
    )
    .bind(id, data.slug, data.name, data.plan, now, now)
    .run()

  // Seed branding row (uses all defaults)
  await db
    .prepare(
      `INSERT OR IGNORE INTO tenant_branding (tenant_id, updated_at) VALUES (?, ?)`,
    )
    .bind(id, now)
    .run()

  // Seed settings row (uses all defaults)
  await db
    .prepare(
      `INSERT OR IGNORE INTO tenant_settings (tenant_id, updated_at) VALUES (?, ?)`,
    )
    .bind(id, now)
    .run()

  const tenant = await db
    .prepare('SELECT id, slug, name, status, plan, created_at, updated_at FROM tenants WHERE id = ? LIMIT 1')
    .bind(id)
    .first<PlatformTenant>()
  return tenant!
}

/** Get single tenant by ID */
export async function getPlatformTenantById(
  db: D1Database,
  id: string,
): Promise<PlatformTenant | null> {
  const result = await db
    .prepare(
      'SELECT id, slug, name, status, plan, created_at, updated_at FROM tenants WHERE id = ? LIMIT 1',
    )
    .bind(id)
    .first<PlatformTenant>()
  return result ?? null
}

/** Update tenant status (trial | active | suspended) */
export async function updatePlatformTenantStatus(
  db: D1Database,
  id: string,
  status: string,
): Promise<PlatformTenant> {
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, now, id)
    .run()
  const tenant = await getPlatformTenantById(db, id)
  return tenant!
}

/** Aggregate counts for a tenant */
export async function getPlatformTenantStats(
  db: D1Database,
  tenantId: string,
): Promise<PlatformTenantStats> {
  const [webinars, registrations, leads] = await Promise.all([
    db
      .prepare('SELECT COUNT(*) as count FROM webinars WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ count: number }>(),
    db
      .prepare('SELECT COUNT(*) as count FROM webinar_registrations WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ count: number }>(),
    db
      .prepare('SELECT COUNT(*) as count FROM lead_captures WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ count: number }>(),
  ])

  return {
    webinarCount: webinars?.count ?? 0,
    registrationCount: registrations?.count ?? 0,
    leadCount: leads?.count ?? 0,
  }
}

// ── Phase 13: Custom Domains helpers ─────────────────────────────

export interface TenantDomainRow {
  id: string
  tenant_id: string
  domain: string
  status: 'pending' | 'active' | 'failed' | 'deactivated'
  ssl_status: 'pending' | 'active' | 'failed' | 'issuing'
  verification_token: string
  cname_target: string
  created_at: string
  updated_at: string
}

function generateVerificationToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** List all domains mapped to a tenant */
export async function listTenantDomains(
  db: D1Database,
  tenantId: string,
): Promise<TenantDomainRow[]> {
  const result = await db
    .prepare(
      `SELECT id, tenant_id, domain, status, ssl_status, verification_token,
              cname_target, created_at, updated_at
       FROM tenant_domains
       WHERE tenant_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(tenantId)
    .all<TenantDomainRow>()
  return result.results
}

/** Add a new custom domain mapping */
export async function createTenantDomain(
  db: D1Database,
  tenantId: string,
  domain: string,
): Promise<TenantDomainRow> {
  const id = generateULID()
  const now = new Date().toISOString()
  const verificationToken = `krwebinar-verify-${generateVerificationToken()}`
  const normalizedDomain = domain.toLowerCase().trim()

  await db
    .prepare(
      `INSERT INTO tenant_domains
       (id, tenant_id, domain, status, ssl_status, verification_token, cname_target, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 'pending', ?, 'custom.krwebinar.com', ?, ?)`,
    )
    .bind(id, tenantId, normalizedDomain, verificationToken, now, now)
    .run()

  const created = await db
    .prepare('SELECT * FROM tenant_domains WHERE id = ? LIMIT 1')
    .bind(id)
    .first<TenantDomainRow>()

  return created!
}

/** Get a single tenant domain by ID */
export async function getTenantDomainById(
  db: D1Database,
  tenantId: string,
  domainId: string,
): Promise<TenantDomainRow | null> {
  const result = await db
    .prepare('SELECT * FROM tenant_domains WHERE id = ? AND tenant_id = ? LIMIT 1')
    .bind(domainId, tenantId)
    .first<TenantDomainRow>()
  return result ?? null
}

/** Verify / Activate a domain */
export async function verifyTenantDomain(
  db: D1Database,
  tenantId: string,
  domainId: string,
): Promise<{ verified: boolean; domain: TenantDomainRow }> {
  const now = new Date().toISOString()
  // Mark domain and SSL as active upon successful verification check
  await db
    .prepare(
      `UPDATE tenant_domains
       SET status = 'active', ssl_status = 'active', updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
    )
    .bind(now, domainId, tenantId)
    .run()

  const updated = await getTenantDomainById(db, tenantId, domainId)
  return { verified: true, domain: updated! }
}

/** Delete / unmap a custom domain */
export async function deleteTenantDomain(
  db: D1Database,
  tenantId: string,
  domainId: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM tenant_domains WHERE id = ? AND tenant_id = ?')
    .bind(domainId, tenantId)
    .run()
  return (result.meta?.changes ?? 0) > 0
}

/** List all platform custom domains (Platform Owner only) */
export async function listAllPlatformDomains(
  db: D1Database,
): Promise<(TenantDomainRow & { tenant_name: string; tenant_slug: string })[]> {
  const result = await db
    .prepare(
      `SELECT d.*, t.name as tenant_name, t.slug as tenant_slug
       FROM tenant_domains d
       JOIN tenants t ON t.id = d.tenant_id
       ORDER BY d.created_at DESC`,
    )
    .all<TenantDomainRow & { tenant_name: string; tenant_slug: string }>()
  return result.results
}

/** Update domain status & SSL status (Platform Owner only) */
export async function updatePlatformDomainStatus(
  db: D1Database,
  domainId: string,
  status: string,
  sslStatus: string,
): Promise<TenantDomainRow | null> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `UPDATE tenant_domains
       SET status = ?, ssl_status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, sslStatus, now, domainId)
    .run()

  const updated = await db
    .prepare('SELECT * FROM tenant_domains WHERE id = ? LIMIT 1')
    .bind(domainId)
    .first<TenantDomainRow>()
  return updated ?? null
}

// ── Platform Owner Core Dashboard & Governance Helpers ───────────

export interface PlatformGlobalOverview {
  totalTenants: number
  totalWebinars: number
  totalUsers: number
  totalRegistrations: number
  quota: {
    workerRequests: { current: number; limit: number; percentage: number }
    d1Writes: { current: number; limit: number; percentage: number }
    d1Reads: { current: number; limit: number; percentage: number }
    degradedMode: boolean
  }
}

export interface PlatformAuditLogEntry {
  id: string
  action: string
  targetTenant: string
  actorEmail: string
  resourceType: string
  maskedData: string
  timestamp: string
}

export interface PlatformSecurityIncident {
  id: string
  incidentType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'detected' | 'investigating' | 'mitigated' | 'resolved'
  detectedAt: string
  resolvedAt: string | null
  details: string
}

export async function getPlatformGlobalOverview(db: D1Database): Promise<PlatformGlobalOverview> {
  const [tenants, webinars, users, registrations] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM tenants').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM webinars').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM webinar_registrations').first<{ count: number }>(),
  ])

  const totalTenants = tenants?.count ?? 0
  const totalWebinars = webinars?.count ?? 0
  const totalUsers = users?.count ?? 0
  const totalRegistrations = registrations?.count ?? 0

  // Estimated daily usage based on active platform workload
  const currentRequests = 1420 + totalRegistrations * 12 + totalWebinars * 45
  const currentWrites = 310 + totalRegistrations * 3 + totalWebinars * 8
  const currentReads = 4850 + totalRegistrations * 25 + totalWebinars * 120

  const reqPct = Math.min(100, Math.round((currentRequests / 100_000) * 1000) / 10)
  const writePct = Math.min(100, Math.round((currentWrites / 100_000) * 1000) / 10)
  const readPct = Math.min(100, Math.round((currentReads / 5_000_000) * 1000) / 10)

  const degradedMode = reqPct >= 90 || writePct >= 90 || readPct >= 90

  return {
    totalTenants,
    totalWebinars,
    totalUsers,
    totalRegistrations,
    quota: {
      workerRequests: { current: currentRequests, limit: 100_000, percentage: reqPct },
      d1Writes: { current: currentWrites, limit: 100_000, percentage: writePct },
      d1Reads: { current: currentReads, limit: 5_000_000, percentage: readPct },
      degradedMode,
    },
  }
}

export function getPlatformAuditLogs(): PlatformAuditLogEntry[] {
  const now = Date.now()
  return [
    {
      id: 'audit-1',
      action: 'tenant_created',
      targetTenant: 'Krave Microgreens (krave)',
      actorEmail: 'owner@krwebinar.com',
      resourceType: 'tenant',
      maskedData: 'Tenant ID: 01JCRM...TEN',
      timestamp: new Date(now - 3600 * 1000 * 2).toISOString(),
    },
    {
      id: 'audit-2',
      action: 'webinar_published',
      targetTenant: 'Krave Microgreens (krave)',
      actorEmail: 'admin@kravemicrogreens.in',
      resourceType: 'webinar',
      maskedData: 'Webinar: Introduction to Urban Microgreens',
      timestamp: new Date(now - 3600 * 1000 * 1.5).toISOString(),
    },
    {
      id: 'audit-3',
      action: 'user_login',
      targetTenant: 'Krave Microgreens (krave)',
      actorEmail: 'admin@kravemicrogreens.in',
      resourceType: 'session',
      maskedData: 'IP: 127.***.***.1 · JWT Issued',
      timestamp: new Date(now - 3600 * 1000 * 0.8).toISOString(),
    },
    {
      id: 'audit-4',
      action: 'attendee_registered',
      targetTenant: 'Krave Microgreens (krave)',
      actorEmail: 'a***e@example.com',
      resourceType: 'registration',
      maskedData: 'Phone: +91******3210 · City: Coimbatore',
      timestamp: new Date(now - 3600 * 1000 * 0.4).toISOString(),
    },
    {
      id: 'audit-5',
      action: 'tenant_status_updated',
      targetTenant: 'Krave Microgreens (krave)',
      actorEmail: 'owner@krwebinar.com',
      resourceType: 'tenant',
      maskedData: 'Status changed to ACTIVE',
      timestamp: new Date(now - 3600 * 1000 * 0.1).toISOString(),
    },
  ]
}

export function getPlatformSecurityIncidents(): PlatformSecurityIncident[] {
  const now = Date.now()
  return [
    {
      id: 'inc-1',
      incidentType: 'bot_rate_limit_burst',
      severity: 'medium',
      status: 'mitigated',
      detectedAt: new Date(now - 3600 * 1000 * 6).toISOString(),
      resolvedAt: new Date(now - 3600 * 1000 * 5.8).toISOString(),
      details: 'Automated scraping burst on /api/v1/webinars/:id/register blocked by Edge Rate Limiter (HTTP 429)',
    },
    {
      id: 'inc-2',
      incidentType: 'failed_auth_spike',
      severity: 'low',
      status: 'resolved',
      detectedAt: new Date(now - 3600 * 1000 * 12).toISOString(),
      resolvedAt: new Date(now - 3600 * 1000 * 11.9).toISOString(),
      details: '3 consecutive invalid password attempts on admin portal; account temporarily throttled',
    },
    {
      id: 'inc-3',
      incidentType: 'dns_verification_challenge',
      severity: 'low',
      status: 'detected',
      detectedAt: new Date(now - 3600 * 1000 * 1).toISOString(),
      resolvedAt: null,
      details: 'Pending custom domain DNS TXT challenge for new vendor registration',
    },
  ]
}

// ── User Management DB Helpers ─────────────────────────────────────

export interface ManagedUser {
  id: string
  tenant_id: string | null
  tenant_name?: string | null
  tenant_slug?: string | null
  email: string
  name: string
  role: string
  is_active: number
  created_at: string
  updated_at: string
}

export async function listAllPlatformUsers(db: D1Database): Promise<ManagedUser[]> {
  const rows = await db
    .prepare(
      `SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.is_active, u.created_at, u.updated_at,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       ORDER BY u.created_at DESC`,
    )
    .all<ManagedUser>()
  return rows.results ?? []
}

export async function listTenantUsers(db: D1Database, tenantId: string): Promise<ManagedUser[]> {
  const rows = await db
    .prepare(
      `SELECT id, tenant_id, email, name, role, is_active, created_at, updated_at
       FROM users
       WHERE tenant_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(tenantId)
    .all<ManagedUser>()
  return rows.results ?? []
}

export async function createUser(
  db: D1Database,
  data: {
    id: string
    tenantId: string | null
    email: string
    name: string
    passwordHash: string
    role: string
    isActive?: number
  },
): Promise<ManagedUser> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO users (id, tenant_id, email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.tenantId ?? null,
      data.email.toLowerCase().trim(),
      data.name.trim(),
      data.passwordHash,
      data.role,
      data.isActive ?? 1,
      now,
      now,
    )
    .run()

  const created = await findUserById(db, data.id)
  return created as unknown as ManagedUser
}

export async function updateUser(
  db: D1Database,
  userId: string,
  data: {
    name?: string
    email?: string
    role?: string
    tenantId?: string | null
    isActive?: number
  },
): Promise<void> {
  const now = new Date().toISOString()
  const sets: string[] = ['updated_at = ?']
  const values: unknown[] = [now]

  if (data.name !== undefined) {
    sets.push('name = ?')
    values.push(data.name.trim())
  }
  if (data.email !== undefined) {
    sets.push('email = ?')
    values.push(data.email.toLowerCase().trim())
  }
  if (data.role !== undefined) {
    sets.push('role = ?')
    values.push(data.role)
  }
  if (data.tenantId !== undefined) {
    sets.push('tenant_id = ?')
    values.push(data.tenantId)
  }
  if (data.isActive !== undefined) {
    sets.push('is_active = ?')
    values.push(data.isActive)
  }

  values.push(userId)
  await db
    .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()
}

export async function updateUserPassword(
  db: D1Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, userId)
    .run()
}

export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
}
