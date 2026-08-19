/**
 * useLeads — Phase 11
 * React Query hooks for admin leads data
 */

import { useQuery } from '@tanstack/react-query'
import { getAccessToken } from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────

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

// ── Fetch helper ──────────────────────────────────────────────────

async function authFetch<T>(path: string): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(path, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const json = await res.json() as { ok: boolean; data?: T; error?: { message: string } }
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data!
}

// ── Hooks ─────────────────────────────────────────────────────────

export function useLeads(webinarId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'leads', webinarId],
    queryFn: () =>
      authFetch<{ leads: Lead[]; total: number; summary: LeadsSummary }>(
        `/api/v1/admin/webinars/${webinarId}/leads`,
      ),
    enabled: !!webinarId,
    staleTime: 60_000,
  })
}

/** Open the leads CSV export in a new tab (browser downloads it) */
export function downloadLeadsCsv(webinarId: string) {
  window.open(`/api/v1/admin/webinars/${webinarId}/leads/export`, '_blank')
}
