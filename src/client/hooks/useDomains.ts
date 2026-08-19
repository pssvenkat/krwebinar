/**
 * useDomains — Phase 13 Custom Domains hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { TenantDomain, DomainInstructions } from '../lib/api'

export type { TenantDomain, DomainInstructions }

export function useDomains() {
  return useQuery({
    queryKey: ['admin', 'domains'],
    queryFn: async () => {
      const res = await api.domains.list()
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useAddDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (domain: string) => {
      const res = await api.domains.add(domain)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}

export function useVerifyDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.domains.verify(id)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}

export function useDeleteDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.domains.delete(id)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}
