/**
 * Analytics client hooks — Phase 9
 *
 * usePlatformAnalytics()        → platform KPI summary
 * useWebinarAnalytics(id)       → per-webinar breakdown
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { PlatformAnalytics, WebinarAnalytics } from '../lib/api'

export type { PlatformAnalytics, WebinarAnalytics }

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'platform'],
    queryFn: async () => {
      const res = await api.analytics.platform()
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    staleTime: 60_000,
  })
}

export function useWebinarAnalytics(webinarId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'webinar', webinarId],
    queryFn: async () => {
      const res = await api.analytics.webinar(webinarId!)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    enabled: !!webinarId,
    staleTime: 60_000,
  })
}
