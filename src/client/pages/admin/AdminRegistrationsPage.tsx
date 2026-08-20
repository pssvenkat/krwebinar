/**
 * AdminRegistrationsPage — List of all attendee registrations and participants across tenant webinars
 */

import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useWebinars } from '../../hooks/useWebinars'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
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
  attended_at?: string | null
}

async function fetchAllRegistrations(): Promise<RegistrationItem[]> {
  const token = getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': 'krave',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  // 1. Try single-query bulk endpoint
  try {
    const res = await fetch('/api/v1/admin/registrations', { headers })
    const json = (await res.json()) as { ok: boolean; data?: { registrations: RegistrationItem[] } }
    if (json.ok && json.data?.registrations) {
      return json.data.registrations
    }
  } catch {
    // fallback below
  }

  // 2. Fallback: fetch list of webinars and their individual registrations
  const webRes = await fetch('/api/v1/admin/webinars', { headers })
  const webJson = (await webRes.json()) as { ok: boolean; data?: { webinars: { id: string; title: string }[] } }
  if (!webJson.ok || !webJson.data?.webinars) return []

  const allRegs: RegistrationItem[] = []
  for (const w of webJson.data.webinars) {
    try {
      const regRes = await fetch(`/api/v1/admin/webinars/${w.id}/registrations`, { headers })
      const regJson = (await regRes.json()) as {
        ok: boolean
        data?: { registrations: Omit<RegistrationItem, 'webinar_title' | 'webinar_id'>[] }
      }
      if (regJson.ok && regJson.data?.registrations) {
        for (const r of regJson.data.registrations) {
          allRegs.push({ ...r, webinar_title: w.title, webinar_id: w.id })
        }
      }
    } catch {
      // Continue next webinar
    }
  }
  return allRegs
}

function downloadCsv(data: RegistrationItem[], filename: string) {
  const headers = ['Attendee Name', 'Email', 'Phone Number', 'City', 'Country', 'Attendance Status', 'Registered Date', 'Webinar Title']
  const rows = data.map((r) => [
    `"${(r.name || '').replace(/"/g, '""')}"`,
    `"${(r.email || '').replace(/"/g, '""')}"`,
    `"${(r.phone_e164 || '').replace(/"/g, '""')}"`,
    `"${(r.city || '').replace(/"/g, '""')}"`,
    `"${(r.country_code || '').replace(/"/g, '""')}"`,
    `"${r.attended ? 'Attended' : 'Registered'}"`,
    `"${r.registered_at ? new Date(r.registered_at).toLocaleString() : ''}"`,
    `"${(r.webinar_title || '').replace(/"/g, '""')}"`,
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AdminRegistrationsPage() {
  const location = useLocation()
  const isParticipantsPage = location.pathname.includes('participants')

  const { data: webinarsData } = useWebinars()
  const { data: registrations, isLoading, error } = useQuery({
    queryKey: ['admin', 'all-registrations'],
    queryFn: fetchAllRegistrations,
    staleTime: 30_000,
  })

  const [search, setSearch] = useState('')
  const [selectedWebinar, setSelectedWebinar] = useState<string>('all')
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'attended' | 'registered'>(
    isParticipantsPage ? 'attended' : 'all',
  )

  if (isLoading) return <LoadingState label={isParticipantsPage ? 'Loading participants…' : 'Loading registrations…'} />
  if (error) return <ErrorState error={error as Error} />

  const list = (registrations ?? []).filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.phone_e164 && r.phone_e164.includes(search)) ||
      (r.city && r.city.toLowerCase().includes(search.toLowerCase())) ||
      (r.webinar_title && r.webinar_title.toLowerCase().includes(search.toLowerCase()))

    const matchesWebinar = selectedWebinar === 'all' || r.webinar_id === selectedWebinar

    let matchesAttendance = true
    if (isParticipantsPage) {
      matchesAttendance = Boolean(r.attended)
    } else if (attendanceFilter === 'attended') {
      matchesAttendance = Boolean(r.attended)
    } else if (attendanceFilter === 'registered') {
      matchesAttendance = !r.attended
    }

    return matchesSearch && matchesWebinar && matchesAttendance
  })

  const pageTitle = isParticipantsPage ? 'Participants' : 'Registrations'
  const pageSubtitle = isParticipantsPage
    ? 'Attendees who actively joined and attended your live webinar sessions.'
    : 'View and manage all registered attendees across your webinars.'
  const csvFileName = isParticipantsPage ? 'participants_export.csv' : 'registrations_export.csv'

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{pageTitle}</h1>
          <p className="admin-page-subtitle">{pageSubtitle}</p>
        </div>
        <div className="admin-page-header-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv(list, csvFileName)}
            disabled={list.length === 0}
          >
            ↓ Export CSV ({list.length})
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name, email, phone, city…"
          className="platform-input"
          style={{ maxWidth: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="platform-input"
          style={{ maxWidth: 240 }}
          value={selectedWebinar}
          onChange={(e) => setSelectedWebinar(e.target.value)}
        >
          <option value="all">All Webinars</option>
          {webinarsData?.webinars?.map((w) => (
            <option key={w.id} value={w.id}>{w.title}</option>
          ))}
        </select>

        {!isParticipantsPage && (
          <select
            className="platform-input"
            style={{ maxWidth: 180 }}
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value as 'all' | 'attended' | 'registered')}
          >
            <option value="all">All Statuses</option>
            <option value="registered">Registered Only</option>
            <option value="attended">Attended Only</option>
          </select>
        )}
      </div>

      {list.length === 0 ? (
        <div className="leads-empty">
          <p>No {isParticipantsPage ? 'participants' : 'registrations'} found matching your filters.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{isParticipantsPage ? 'Participant' : 'Attendee'}</th>
                <th>Phone Number</th>
                <th>City / Country</th>
                <th>{isParticipantsPage ? 'Status' : 'Attendance'}</th>
                <th>Registered Date</th>
                <th>Webinar</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="admin-table-row">
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{r.email}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}>
                    {r.phone_e164 ? (
                      <span style={{ color: 'var(--color-text)' }}>{r.phone_e164}</span>
                    ) : (
                      <span style={{ color: 'var(--color-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {r.city || '—'} {r.country_code ? `(${r.country_code})` : ''}
                  </td>
                  <td>
                    <Badge variant={r.attended ? 'success' : 'default'} dot={Boolean(r.attended)}>
                      {r.attended ? 'Attended' : 'Registered'}
                    </Badge>
                  </td>
                  <td className="admin-table-date">{new Date(r.registered_at).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{r.webinar_title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
