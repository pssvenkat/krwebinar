/**
 * usePlatformTenants — Phase 12
 * React Query hooks for the platform admin UI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────

export interface PlatformTenant {
  id: string
  slug: string
  name: string
  status: 'trial' | 'active' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface PlatformTenantStats {
  webinarCount: number
  registrationCount: number
  leadCount: number
}

// ── Fetch helper ──────────────────────────────────────────────────

async function platformFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  })
  const json = (await res.json()) as { ok: boolean; data?: T; error?: { message: string } }
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data!
}

// ── Hooks ─────────────────────────────────────────────────────────

export function usePlatformTenants() {
  return useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformFetch<{ tenants: PlatformTenant[] }>('/api/platform/tenants'),
    staleTime: 30_000,
  })
}

export function usePlatformTenant(id: string | undefined) {
  return useQuery({
    queryKey: ['platform', 'tenants', id],
    queryFn: () =>
      platformFetch<{ tenant: PlatformTenant; stats: PlatformTenantStats }>(
        `/api/platform/tenants/${id}`,
      ),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreatePlatformTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; slug: string; plan: string }) =>
      platformFetch<{ tenant: PlatformTenant }>('/api/platform/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
  })
}

export function useUpdateTenantStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      platformFetch<{ tenant: PlatformTenant }>(`/api/platform/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      qc.invalidateQueries({ queryKey: ['platform', 'tenants', id] })
    },
  })
}

// ── Domain Management Hooks (Platform Admin) ─────────────────────

export interface PlatformTenantDomain {
  id: string
  tenant_id: string
  domain: string
  status: 'pending' | 'active' | 'failed'
  ssl_status: 'pending' | 'active' | 'failed'
  verification_token: string
  cname_target: string
  created_at: string
  updated_at: string
  tenant_name?: string
  tenant_slug?: string
}

export function usePlatformTenantDomains(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['platform', 'tenants', tenantId, 'domains'],
    queryFn: () =>
      platformFetch<{
        domains: PlatformTenantDomain[]
        instructions: { cnameTarget: string; txtPrefix: string }
      }>(`/api/platform/tenants/${tenantId}/domains`),
    enabled: !!tenantId,
    staleTime: 15_000,
  })
}

export function useAllPlatformDomains() {
  return useQuery({
    queryKey: ['platform', 'domains'],
    queryFn: () => platformFetch<{ domains: PlatformTenantDomain[] }>('/api/platform/domains'),
    staleTime: 15_000,
  })
}

export function useCreatePlatformTenantDomain(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) =>
      platformFetch<{ domain: PlatformTenantDomain }>(`/api/platform/tenants/${tenantId}/domains`, {
        method: 'POST',
        body: JSON.stringify({ domain }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId, 'domains'] })
      qc.invalidateQueries({ queryKey: ['platform', 'domains'] })
    },
  })
}

export function useVerifyPlatformTenantDomain(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainId: string) =>
      platformFetch<{ verified: boolean; domain: PlatformTenantDomain }>(
        `/api/platform/tenants/${tenantId}/domains/${domainId}/verify`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId, 'domains'] })
      qc.invalidateQueries({ queryKey: ['platform', 'domains'] })
    },
  })
}

export function useDeletePlatformTenantDomain(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainId: string) =>
      platformFetch<{ deleted: boolean }>(`/api/platform/tenants/${tenantId}/domains/${domainId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId, 'domains'] })
      qc.invalidateQueries({ queryKey: ['platform', 'domains'] })
    },
  })
}
