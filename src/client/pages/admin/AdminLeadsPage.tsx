/**
 * AdminLeadsPage — Platform-wide leads capture & feedback overview
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { getAccessToken } from '../../lib/api'

interface LeadItem {
  id: string
  webinar_id: string
  webinar_title: string
  name: string
  email: string
  phone_e164: string | null
  country_code: string | null
  city: string | null
  star_rating: number | null
  interest_areas: string[]
  consent_follow_up: number
  preferred_contact: string | null
  feedback_notes: string | null
  submitted_at: string
}

async function fetchLeads(): Promise<LeadItem[]> {
  const token = getAccessToken()
  const res = await fetch('/api/v1/admin/leads/overview', {
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': 'krave',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) return []
  const json = (await res.json()) as { ok: boolean; data?: { leads: LeadItem[] } }
  return json.data?.leads ?? []
}

function downloadLeadsCsv(data: LeadItem[]) {
  const headers = ['Name', 'Email', 'Phone Number', 'City', 'Country', 'Rating', 'Interests', 'Preferred Contact', 'Feedback / Suggestions', 'Submitted Date', 'Webinar Title']
  const rows = data.map((l) => [
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.phone_e164 || '').replace(/"/g, '""')}"`,
    `"${(l.city || '').replace(/"/g, '""')}"`,
    `"${(l.country_code || '').replace(/"/g, '""')}"`,
    `"${l.star_rating ? `${l.star_rating} Stars` : ''}"`,
    `"${(l.interest_areas || []).join(', ').replace(/"/g, '""')}"`,
    `"${(l.preferred_contact || (l.consent_follow_up ? 'Yes' : 'No')).replace(/"/g, '""')}"`,
    `"${(l.feedback_notes || '').replace(/"/g, '""')}"`,
    `"${l.submitted_at ? new Date(l.submitted_at).toLocaleString() : ''}"`,
    `"${(l.webinar_title || '').replace(/"/g, '""')}"`,
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads_feedback_export_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AdminLeadsPage() {
  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['admin', 'leads-overview'],
    queryFn: fetchLeads,
    staleTime: 30_000,
  })

  const [search, setSearch] = useState('')

  if (isLoading) return <LoadingState label="Loading leads & feedback…" />
  if (error) return <ErrorState error={error as Error} />

  const list = (leads ?? []).filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone_e164 && l.phone_e164.includes(search)) ||
      (l.city && l.city.toLowerCase().includes(search.toLowerCase())) ||
      (l.webinar_title && l.webinar_title.toLowerCase().includes(search.toLowerCase())) ||
      (l.feedback_notes && l.feedback_notes.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Captured Leads & Feedback</h1>
          <p className="admin-page-subtitle">
            High-intent participants, inquiries, and feedback submissions collected from your webinars.
          </p>
        </div>
        <div className="admin-page-header-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadLeadsCsv(list)}
            disabled={list.length === 0}
          >
            ↓ Export CSV ({list.length})
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Filter leads by name, email, phone, city, feedback…"
          className="platform-input"
          style={{ maxWidth: 360 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.length === 0 ? (
        <div className="leads-empty">
          <p>No leads or feedback captured yet.</p>
          <p className="leads-empty-hint">Leads and survey ratings will appear here as attendees complete post-webinar feedback surveys.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Phone Number</th>
                <th>City / Country</th>
                <th>Rating</th>
                <th>Interests & Notes</th>
                <th>Contact Pref</th>
                <th>Submitted</th>
                <th>Webinar</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} className="admin-table-row">
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{l.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{l.email}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}>
                    {l.phone_e164 ? (
                      <span style={{ color: 'var(--color-text)' }}>{l.phone_e164}</span>
                    ) : (
                      <span style={{ color: 'var(--color-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {l.city || '—'} {l.country_code ? `(${l.country_code})` : ''}
                  </td>
                  <td>
                    {l.star_rating ? (
                      <span style={{ color: '#eab308', fontWeight: 700, fontSize: '0.9rem' }}>
                        {'★'.repeat(l.star_rating)}{'☆'.repeat(5 - l.star_rating)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: l.feedback_notes ? '0.25rem' : 0 }}>
                      {l.interest_areas?.map((i) => (
                        <Badge key={i} variant="primary">{i}</Badge>
                      ))}
                    </div>
                    {l.feedback_notes && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #475569)', fontStyle: 'italic', maxWidth: 260 }}>
                        "{l.feedback_notes}"
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge variant={l.consent_follow_up ? 'success' : 'default'}>
                      {l.preferred_contact?.toUpperCase() || (l.consent_follow_up ? 'OPT-IN' : 'NO')}
                    </Badge>
                  </td>
                  <td className="admin-table-date">{new Date(l.submitted_at).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{l.webinar_title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
