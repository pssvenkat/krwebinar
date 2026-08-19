/**
 * useLeads — Phase 11
 * React Query hooks for admin leads data
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Lead, LeadsSummary } from '../lib/api'

export type { Lead, LeadsSummary }

export function useLeads(webinarId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'leads', webinarId],
    queryFn: async () => {
      const res = await api.leads.webinar(webinarId!)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    enabled: !!webinarId,
    staleTime: 60_000,
  })
}

/** Open the leads CSV export in a new tab (browser downloads it) */
export function downloadLeadsCsv(webinarId: string) {
  window.open(`/api/v1/admin/webinars/${webinarId}/leads/export.csv`, '_blank')
}
