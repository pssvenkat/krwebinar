/**
 * useTrainer — React Query hooks for trainer profile management
 *
 * Provides:
 *  - useTrainer(): Fetches trainer profile for admin
 *  - usePublicTrainer(): Fetches trainer profile for public landing page
 *  - useUpdateTrainer(): Mutation for updating trainer profile
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type TrainerProfile } from '../lib/api'

export const TRAINER_QUERY_KEY = ['admin', 'trainer']
export const PUBLIC_TRAINER_QUERY_KEY = ['public', 'trainer']

export function useTrainer() {
  return useQuery({
    queryKey: TRAINER_QUERY_KEY,
    queryFn: async () => {
      const res = await api.trainer.get()
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load trainer profile')
      return res.data
    },
    staleTime: 60_000,
  })
}

export function usePublicTrainer() {
  return useQuery({
    queryKey: PUBLIC_TRAINER_QUERY_KEY,
    queryFn: async () => {
      const res = await api.trainer.getPublic()
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load trainer profile')
      return res.data
    },
    staleTime: 300_000,
  })
}

export function useUpdateTrainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<TrainerProfile>) => {
      const res = await api.trainer.update(data)
      if (!res.ok) throw new Error(res.error?.message || 'Failed to update trainer profile')
      return res.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(TRAINER_QUERY_KEY, updated)
      queryClient.invalidateQueries({ queryKey: PUBLIC_TRAINER_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['public', 'landing', 'featured'] })
    },
  })
}
