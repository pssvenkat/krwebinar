/**
 * AdminRegistrationsPage — List of all attendee registrations across tenant webinars
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWebinars } from '../../hooks/useWebinars'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { getAccessToken } from '../../lib/api'

interface RegistrationItem {
  id: string
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  city: string | null
  webinar_title: string
  webinar_id: string
  attended: number
  registered_at: string
}

async function fetchAllRegistrations(): Promise<RegistrationItem[]> {
  const token = getAccessToken()
  const res = await fetch('/api/v1/admin/webinars', {
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': 'krave',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json = (await res.json()) as { ok: boolean; data?: { webinars: { id: string; title: string }[] } }
  if (!json.ok || !json.data) return []

  // Fetch registrations for all webinars
  const allRegs: RegistrationItem[] = []
  for (const w of json.data.webinars) {
    try {
      const regRes = await fetch(`/api/v1/admin/webinars/${w.id}/registrations`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': 'krave',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const regJson = (await regRes.json()) as { ok: boolean; data?: { registrations: Omit<RegistrationItem, 'webinar_title' | 'webinar_id'>[] } }
      if (regJson.ok && regJson.data?.registrations) {
        for (const r of regJson.data.registrations) {
          allRegs.push({ ...r, webinar_title: w.title, webinar_id: w.id })
        }
      }
    } catch {
      // Continue
    }
  }
  return allRegs
}

export default function AdminRegistrationsPage() {
  const { data: webinarsData } = useWebinars()
  const { data: registrations, isLoading, error } = useQuery({
    queryKey: ['admin', 'all-registrations'],
    queryFn: fetchAllRegistrations,
    staleTime: 30_000,
  })

  const [search, setSearch] = useState('')
  const [selectedWebinar, setSelectedWebinar] = useState<string>('all')

  if (isLoading) return <LoadingState label="Loading registrations…" />
  if (error) return <ErrorState error={error as Error} />

  const list = (registrations ?? []).filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.city && r.city.toLowerCase().includes(search.toLowerCase()))
    const matchesWebinar = selectedWebinar === 'all' || r.webinar_id === selectedWebinar
    return matchesSearch && matchesWebinar
  })

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Registrations</h1>
          <p className="admin-page-subtitle">
            View and manage all registered attendees across your webinars.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, email, city…"
          className="platform-input"
          style={{ maxWidth: 300 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="platform-input"
          style={{ maxWidth: 260 }}
          value={selectedWebinar}
          onChange={(e) => setSelectedWebinar(e.target.value)}
        >
          <option value="all">All Webinars</option>
          {webinarsData?.webinars?.map((w) => (
            <option key={w.id} value={w.id}>{w.title}</option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="leads-empty">
          <p>No registrations found matching criteria.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Webinar</th>
                <th>City / Country</th>
                <th>Attendance</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="admin-table-row">
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{r.email}</div>
                  </td>
                  <td>{r.webinar_title}</td>
                  <td>{r.city || '—'} {r.country_code ? `(${r.country_code})` : ''}</td>
                  <td>
                    <Badge variant={r.attended ? 'success' : 'default'} dot={Boolean(r.attended)}>
                      {r.attended ? 'Attended' : 'Registered'}
                    </Badge>
                  </td>
                  <td className="admin-table-date">{new Date(r.registered_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
