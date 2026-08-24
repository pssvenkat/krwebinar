/**
 * useLandingConfig — React Query hooks for landing page CMS & fallback redirect
 *
 * Provides:
 *  - useLandingConfig(): Fetches landing page configuration for admin
 *  - usePublicLandingConfig(): Fetches public landing page configuration
 *  - useUpdateLandingConfig(): Mutation to update landing page configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type LandingPageSettings } from '../lib/api'

export const LANDING_CONFIG_QUERY_KEY = ['admin', 'landing-config']
export const PUBLIC_LANDING_CONFIG_QUERY_KEY = ['public', 'landing-config']

export function useLandingConfig() {
  return useQuery({
    queryKey: LANDING_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const res = await api.landing.getConfig()
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load landing page configuration')
      return res.data
    },
    staleTime: 60_000,
  })
}

export function usePublicLandingConfig() {
  return useQuery({
    queryKey: PUBLIC_LANDING_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const res = await api.landing.getPublicConfig()
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load landing page configuration')
      return res.data
    },
    staleTime: 300_000,
  })
}

export function useUpdateLandingConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<LandingPageSettings>) => {
      const res = await api.landing.updateConfig(data)
      if (!res.ok) throw new Error(res.error?.message || 'Failed to save landing page configuration')
      return res.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(LANDING_CONFIG_QUERY_KEY, updated)
      queryClient.invalidateQueries({ queryKey: PUBLIC_LANDING_CONFIG_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['public', 'landing', 'featured'] })
    },
  })
}
