/**
 * Typed API client
 *
 * Thin wrapper over fetch that:
 *  1. Adds the Authorization: Bearer token automatically
 *  2. Adds X-Tenant-Slug header for local dev
 *  3. Returns typed ApiSuccess<T> | ApiError
 *  4. Handles 401 token expiry by attempting one silent refresh
 */

import type { ApiSuccess, ApiError } from '../../shared/types'

export type ApiResult<T> = ApiSuccess<T> | ApiError

const BASE_URL = '/api/v1'

// ── Token storage (in-memory only — no localStorage for security) ──

let _accessToken: string | null = null
let _onUnauthorized: (() => void) | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

/** Called by AuthContext when token expires and refresh also fails */
export function onUnauthorized(cb: () => void) {
  _onUnauthorized = cb
}

// ── Core fetch wrapper ─────────────────────────────────────────────

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  tenantSlug?: string
  skipAuth?: boolean
  skipRefresh?: boolean   // prevent infinite loop on refresh call
}

export async function _fetch<T>(path: string, options: FetchOptions = {}): Promise<ApiResult<T>> {
  const { body, tenantSlug, skipAuth, skipRefresh, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  }

  if (!skipAuth && _accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  // Dev: inject tenant slug via header (defaults to krave)
  headers['X-Tenant-Slug'] = tenantSlug || headers['X-Tenant-Slug'] || 'krave'

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      credentials: 'include',   // sends httpOnly refresh cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    // Silent token refresh on 401
    if (res.status === 401 && !skipRefresh && !skipAuth) {
      const refreshed = await _silentRefresh()
      if (refreshed) {
        // Retry with new token
        return _fetch<T>(path, { ...options, skipRefresh: true })
      } else {
        _onUnauthorized?.()
        return { ok: false, error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' } }
      }
    }

    const json = (await res.json()) as ApiResult<T>
    return json
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      },
    }
  }
}

async function _silentRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = (await res.json()) as ApiResult<{ accessToken: string }>
    if (json.ok) {
      setAccessToken(json.data.accessToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

// ── Typed API methods ──────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      _fetch<{ accessToken: string; user: { id: string; email: string; name: string; role: string }; expiresIn: number }>(
        '/auth/login',
        { method: 'POST', body: { email, password }, skipAuth: true },
      ),
    logout: () => _fetch<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () => _fetch<{ user: { id: string; email: string; name: string; role: string; lastLoginAt: string | null } }>('/auth/me'),
    refresh: () =>
      _fetch<{ accessToken: string; expiresIn: number }>('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
        skipRefresh: true,
      }),
  },

  // Tenant
  tenant: {
    get: () =>
      _fetch<{
        tenant: { id: string; slug: string; name: string; planTier: string }
        branding: Record<string, unknown> | null
        settings: Record<string, unknown> | null
      }>('/tenant', { skipAuth: true }),
  },

  // Webinars (admin)
  webinars: {
    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.page) query.set('page', String(params.page))
      if (params?.limit) query.set('limit', String(params.limit))
      const qs = query.toString() ? `?${query.toString()}` : ''
      return _fetch<{
        webinars: WebinarSummary[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
      }>(`/admin/webinars${qs}`)
    },
    get: (id: string) =>
      _fetch<{ webinar: WebinarDetail }>(`/admin/webinars/${id}`),
    create: (data: CreateWebinarInput) =>
      _fetch<{ webinar: WebinarDetail }>('/admin/webinars', { method: 'POST', body: data }),
    update: (id: string, data: Partial<CreateWebinarInput> & { registrationOpen?: boolean }) =>
      _fetch<{ webinar: WebinarDetail }>(`/admin/webinars/${id}`, { method: 'PUT', body: data }),
    archive: (id: string) =>
      _fetch<{ message: string }>(`/admin/webinars/${id}`, { method: 'DELETE' }),
    publish: (id: string) =>
      _fetch<{ webinar: WebinarDetail }>(`/admin/webinars/${id}/publish`, { method: 'POST' }),
    goLive: (id: string) =>
      _fetch<{ webinar: WebinarDetail }>(`/admin/webinars/${id}/go-live`, { method: 'POST' }),
    end: (id: string) =>
      _fetch<{ webinar: WebinarDetail }>(`/admin/webinars/${id}/end`, { method: 'POST' }),
  },

  // Analytics
  analytics: {
    platform: () =>
      _fetch<PlatformAnalytics>('/admin/analytics'),
    webinar: (id: string) =>
      _fetch<WebinarAnalytics>(`/admin/webinars/${id}/analytics`),
  },

  // Branding & Settings
  branding: {
    get: () => _fetch<BrandingData>('/admin/branding'),
    update: (data: Partial<BrandingData>) => _fetch<{ branding: BrandingData }>('/admin/branding', { method: 'PUT', body: data }),
  },
  settings: {
    get: () => _fetch<SettingsData>('/admin/settings'),
    update: (data: Partial<SettingsData>) => _fetch<{ settings: SettingsData }>('/admin/settings', { method: 'PUT', body: data }),
  },

  // Custom Domains
  domains: {
    list: () => _fetch<{ domains: TenantDomain[]; instructions: DomainInstructions }>('/admin/domains'),
    add: (domain: string) => _fetch<{ domain: TenantDomain }>('/admin/domains', { method: 'POST', body: { domain } }),
    verify: (id: string) => _fetch<{ domain: TenantDomain; verified: boolean; message: string }>(`/admin/domains/${id}/verify`, { method: 'POST' }),
    delete: (id: string) => _fetch<{ message: string }>(`/admin/domains/${id}`, { method: 'DELETE' }),
  },

  // Leads
  leads: {
    webinar: (webinarId: string) => _fetch<{ leads: Lead[]; total: number; summary: LeadsSummary }>(`/admin/webinars/${webinarId}/leads`),
  },
}

// ── Domain types for the client ────────────────────────────────────

export interface WebinarSummary {
  id: string
  title: string
  hostName: string
  startDate: string
  startTime: string
  endTime: string
  timezone: string
  status: string
  maxParticipants: number
  registrationOpen: boolean
}

export interface WebinarDetail extends WebinarSummary {
  description: string | null
  youtubeVideoId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateWebinarInput {
  title: string
  description?: string
  hostName: string
  startDate: string
  startTime: string
  endTime: string
  timezone: string
  maxParticipants?: number
  youtubeVideoId?: string
}

export interface PlatformAnalytics {
  totalWebinars: number
  publishedWebinars: number
  liveWebinars: number
  totalRegistrations: number
  totalAttended: number
  overallAttendanceRate: number
  thisMonthRegistrations: number
  topWebinars: {
    id: string
    title: string
    registrations: number
    attended: number
    attendanceRate: number
  }[]
}

export interface WebinarAnalytics {
  webinarId: string
  title: string
  status: string
  totalRegistrations: number
  attendedCount: number
  attendanceRate: number
  registrationsByDay: { date: string; count: number }[]
  countryCounts: { country: string; count: number }[]
}

export interface BrandingData {
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
}

export interface SettingsData {
  max_webinars: number
  max_participants: number
  chat_rate_limit_messages: number
  chat_rate_limit_window_seconds: number
}

export interface TenantDomain {
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

export interface DomainInstructions {
  cnameTarget: string
  txtPrefix: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  interests: string[]
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
