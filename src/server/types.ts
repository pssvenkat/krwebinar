/**
 * Cloudflare Worker environment bindings.
 * These are injected by the Cloudflare runtime based on wrangler.toml.
 */
export interface Env {
  // D1 Database
  DB: D1Database

  // R2 Storage Bucket
  ASSETS_BUCKET: R2Bucket

  // Durable Object namespace
  WEBINAR_ROOM: DurableObjectNamespace

  // Environment variables (from wrangler.toml [vars])
  ENVIRONMENT: 'development' | 'production' | 'staging'
  PLATFORM_NAME: string
  PLATFORM_DOMAIN: string

  // Secrets (set via: wrangler secret put)
  JWT_SECRET: string
  REFRESH_TOKEN_SECRET: string
  TURNSTILE_SECRET_KEY: string

  // Cloudflare Assets binding
  ASSETS?: Fetcher
}

/**
 * JWT payload — embedded in every access token.
 */
export interface JWTPayload {
  sub: string          // user ID
  tenantId: string | null // null for PLATFORM_OWNER
  role: string         // e.g. 'VENDOR_ADMIN', 'VENDOR_STAFF', 'PLATFORM_OWNER'
  email: string
  iat: number          // issued-at (Unix seconds)
  exp: number          // expiry (Unix seconds)
}

/**
 * Resolved tenant context attached to every request by TenantMiddleware.
 */
export interface TenantContext {
  id: string
  slug: string
  name: string
  planTier: string
  status: string
}

/**
 * Hono context variables — set by middleware, available in route handlers.
 */
export interface HonoVariables {
  tenant: TenantContext
  jwtPayload?: JWTPayload
}

// ── D1 row types (match the SQL schema exactly) ───────────────────

export interface DbTenant {
  id: string
  slug: string
  name: string
  plan_tier: string
  status: string
  created_at: string
  updated_at: string
}

export interface DbTenantBranding {
  id: string
  tenant_id: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  surface_color: string
  text_color: string
  muted_color: string
  border_color: string
  font_heading: string
  font_body: string
  border_radius_base: string
  custom_css: string | null
  created_at: string
  updated_at: string
}

export interface DbTenantSettings {
  id: string
  tenant_id: string
  max_webinars_per_month: number
  max_participants_per_webinar: number
  registration_fields: string   // JSON
  consent_purposes: string      // JSON
  youtube_channel_id: string | null
  support_email: string | null
  support_phone: string | null
  timezone: string
  locale: string
  created_at: string
  updated_at: string
}

export interface DbUser {
  id: string
  tenant_id: string | null
  email: string
  name: string
  password_hash: string
  role: string
  is_active: number
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface DbWebinar {
  id: string
  tenant_id: string
  title: string
  description: string | null
  host_name: string
  start_date: string
  start_time: string
  end_time: string
  timezone: string
  youtube_video_id: string | null
  status: string
  max_participants: number
  registration_open: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DbRegistration {
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
  email_opt_out: number   // 0 = opted in, 1 = opted out (DPDP)
}

export interface DbLeadCapture {
  id: string
  tenant_id: string
  webinar_id: string | null
  registration_id: string | null
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  interests: string        // JSON array
  rating: number | null
  suggestion: string | null
  contact_requested: number
  preferred_contact: string | null
  created_at: string
}

