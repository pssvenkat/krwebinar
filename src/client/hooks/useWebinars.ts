/**
 * useWebinars — paginated webinar list for admin
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { WebinarSummary, WebinarDetail, CreateWebinarInput } from '../lib/api'

export type { WebinarSummary, WebinarDetail, CreateWebinarInput }

// ── List ─────────────────────────────────────────────────────────

export interface WebinarsFilter {
  status?: string
  page?: number
  limit?: number
}

export function useWebinars(filter: WebinarsFilter = {}) {
  return useQuery({
    queryKey: ['webinars', filter],
    queryFn: async () => {
      const res = await api.webinars.list(filter)
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    staleTime: 30_000,
  })
}

// ── Single ────────────────────────────────────────────────────────

export function useWebinar(id: string | undefined) {
  return useQuery({
    queryKey: ['webinar', id],
    queryFn: async () => {
      const res = await api.webinars.get(id!)
      if (!res.ok) throw new Error(res.error.message)
      return res.data.webinar
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

// ── Registrations for a webinar ──────────────────────────────────

export interface Registration {
  id: string
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  city: string | null
  access_token: string
  attended: boolean
  registered_at: string
  attended_at: string | null
}

export function useRegistrations(webinarId: string | undefined) {
  return useQuery({
    queryKey: ['registrations', webinarId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/admin/webinars/${webinarId}/registrations`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${(await import('../lib/api')).getAccessToken() ?? ''}` },
      })
      const json = await r.json() as {
        ok: boolean
        data?: { registrations: Registration[]; total: number }
        error?: { message: string }
      }
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to load registrations')
      return json.data!
    },
    enabled: !!webinarId,
    staleTime: 30_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────

export function useCreateWebinar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateWebinarInput) => {
      const res = await api.webinars.create(data)
      if (!res.ok) throw new Error(res.error.message)
      return res.data.webinar
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['webinars'] }) },
  })
}

export function useUpdateWebinar(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<CreateWebinarInput> & { registrationOpen?: boolean }) => {
      const res = await api.webinars.update(id, data)
      if (!res.ok) throw new Error(res.error.message)
      return res.data.webinar
    },
    onSuccess: (w) => {
      qc.setQueryData(['webinar', id], w)
      void qc.invalidateQueries({ queryKey: ['webinars'] })
    },
  })
}

export function usePublishWebinar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.webinars.publish(id)
      if (!res.ok) throw new Error(res.error.message)
      return res.data.webinar
    },
    onSuccess: (w) => {
      qc.setQueryData(['webinar', w.id], w)
      void qc.invalidateQueries({ queryKey: ['webinars'] })
    },
  })
}

export function useGoLiveWebinar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.webinars.goLive(id)
      if (!res.ok) throw new Error(res.error.message)
      return res.data.webinar
    },
    onSuccess: (w) => {
      qc.setQueryData(['webinar', w.id], w)
      void qc.invalidateQueries({ queryKey: ['webinars'] })
    },
  })
}

export function useEndWebinar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.webinars.end(id)
      if (!res.ok) throw new Error(res.error.message)
      return res.data.webinar
    },
    onSuccess: (w) => {
      qc.setQueryData(['webinar', w.id], w)
      void qc.invalidateQueries({ queryKey: ['webinars'] })
    },
  })
}

export function useArchiveWebinar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.webinars.archive(id)
      if (!res.ok) throw new Error(res.error.message)
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['webinars'] }) },
  })
}
