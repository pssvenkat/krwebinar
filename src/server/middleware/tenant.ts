/**
 * Tenant Middleware
 *
 * Resolves the tenant for every incoming request. Must run before
 * any route handler that needs tenant context.
 *
 * Resolution order:
 *  1. X-Tenant-Slug header   (dev/testing only)
 *  2. Subdomain              ({slug}.platform.com)
 *  3. Custom domain          (exact Host match via DB — Phase 5)
 *
 * Stores the resolved tenant in `c.set('tenant', ...)` so route
 * handlers can read it via `c.get('tenant')`.
 */

import type { MiddlewareHandler } from 'hono'
import { findTenantBySlug, findTenantByDomain } from '../lib/db'
import type { Env, HonoVariables, TenantContext } from '../types'

/** Routes that bypass tenant resolution */
const PUBLIC_BYPASS = ['/api/health', '/api/platform']

export function tenantMiddleware(): MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> {
  return async (c, next) => {
    const path = new URL(c.req.url).pathname

    // Skip tenant resolution for platform-level routes
    if (PUBLIC_BYPASS.some((p) => path.startsWith(p))) {
      return next()
    }

    const db = c.env.DB
    const host = c.req.header('host') ?? ''
    const platformDomain = c.env.PLATFORM_DOMAIN ?? 'platform.com'

    let tenant = null

    // 1. Dev override: X-Tenant-Slug header
    const slugHeader = c.req.header('x-tenant-slug')
    if (slugHeader) {
      tenant = await findTenantBySlug(db, slugHeader)
    }

    // 2. Subdomain detection: {slug}.platform.com
    if (!tenant && host.endsWith(`.${platformDomain}`)) {
      const slug = host.replace(`.${platformDomain}`, '').split('.')[0]
      if (slug) tenant = await findTenantBySlug(db, slug)
    }

    // 3. Custom domain (Phase 5 — for now falls back to slug extraction)
    if (!tenant && host && !host.includes(platformDomain)) {
      tenant = await findTenantByDomain(db, host)
    }

    // 4. Localhost dev fallback
    if (!tenant && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      tenant = await findTenantBySlug(db, 'krave')
    }

    if (!tenant) {
      return c.json({ ok: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } }, 404)
    }

    if (tenant.status === 'suspended') {
      return c.json({ ok: false, error: { code: 'TENANT_SUSPENDED', message: 'This account is suspended' } }, 403)
    }

    const ctx: TenantContext = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      planTier: tenant.plan_tier,
      status: tenant.status,
    }

    c.set('tenant', ctx)
    return next()
  }
}
