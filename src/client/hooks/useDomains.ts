/**
 * useDomains — Phase 13 Custom Domains hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '../lib/api'

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

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> ?? {}),
    },
  })
  const json = (await res.json()) as { ok: boolean; data?: T; error?: { message: string } }
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data!
}

export function useDomains() {
  return useQuery({
    queryKey: ['admin', 'domains'],
    queryFn: () =>
      authFetch<{ domains: TenantDomain[]; instructions: DomainInstructions }>(
        '/api/v1/admin/domains',
      ),
    staleTime: 30_000,
  })
}

export function useAddDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) =>
      authFetch<{ domain: TenantDomain }>('/api/v1/admin/domains', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}

export function useVerifyDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainId: string) =>
      authFetch<{ verified: boolean; domain: TenantDomain }>(
        `/api/v1/admin/domains/${domainId}/verify`,
        { method: 'POST' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}

export function useDeleteDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainId: string) =>
      authFetch<{ deleted: boolean; id: string }>(`/api/v1/admin/domains/${domainId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}
