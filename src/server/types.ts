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

  // Secrets (set via: wrangler secret put)
  JWT_SECRET: string
  TURNSTILE_SECRET_KEY: string
}

/**
 * Hono context variables (set by middleware, available in handlers).
 */
export interface HonoVariables {
  tenantId: string
  userId?: string
  userRole?: string
}
