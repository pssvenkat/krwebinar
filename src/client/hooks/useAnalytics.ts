/**
 * Analytics client hooks — Phase 9
 *
 * usePlatformAnalytics()        → platform KPI summary
 * useWebinarAnalytics(id)       → per-webinar breakdown
 */

import { useQuery } from '@tanstack/react-query'
import { getAccessToken } from '../lib/api'

// ── Types (mirror server types) ───────────────────────────────────

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

// ── Shared authed fetch ───────────────────────────────────────────

async function authFetch<T>(path: string): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json = await res.json() as { ok: boolean; data?: T; error?: { message: string } }
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data!
}

// ── Hooks ─────────────────────────────────────────────────────────

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => authFetch<PlatformAnalytics>('/api/v1/admin/analytics'),
    staleTime: 60_000,
  })
}

export function useWebinarAnalytics(webinarId: string | null | undefined) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'webinar', webinarId],
    queryFn: () => authFetch<WebinarAnalytics>(`/api/v1/admin/webinars/${webinarId}/analytics`),
    enabled: !!webinarId,
    staleTime: 60_000,
  })
}
