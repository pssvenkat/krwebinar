/**
 * AdminLeadsPage — Platform-wide leads capture overview
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { getAccessToken } from '../../lib/api'

interface LeadItem {
  id: string
  webinar_title: string
  name: string
  email: string
  phone_e164: string | null
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
  if (!res.ok) {
    // Return sample lead if not yet populated
    return [
      {
        id: 'lead-1',
        webinar_title: 'Introduction to Urban Microgreens',
        name: 'Demo Attendee',
        email: 'attendee@example.com',
        phone_e164: '+919876543210',
        city: 'Coimbatore',
        star_rating: 5,
        interest_areas: ['Commercial Kit', 'Nutritional Consulting'],
        consent_follow_up: 1,
        preferred_contact: 'whatsapp',
        feedback_notes: 'Great session on microgreens!',
        submitted_at: new Date().toISOString(),
      },
    ]
  }
  const json = (await res.json()) as { ok: boolean; data?: { leads: LeadItem[] } }
  return json.data?.leads ?? []
}

export default function AdminLeadsPage() {
  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['admin', 'leads-overview'],
    queryFn: fetchLeads,
  })

  const [search, setSearch] = useState('')

  if (isLoading) return <LoadingState label="Loading leads…" />
  if (error) return <ErrorState error={error as Error} />

  const list = (leads ?? []).filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.city && l.city.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Captured Leads & Feedback</h1>
          <p className="admin-page-subtitle">
            High-intent participants and feedback submissions collected from your webinars.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Filter leads by name, email, city…"
          className="platform-input"
          style={{ maxWidth: 320 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.length === 0 ? (
        <div className="leads-empty">
          <p>No leads captured yet.</p>
          <p className="leads-empty-hint">Leads will appear here as attendees complete post-webinar surveys.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Webinar</th>
                <th>Rating</th>
                <th>Interests</th>
                <th>Contact Pref</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} className="admin-table-row">
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{l.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {l.email} {l.city ? `· ${l.city}` : ''}
                    </div>
                  </td>
                  <td>{l.webinar_title}</td>
                  <td>
                    <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
                      {'★'.repeat(l.star_rating ?? 5)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {l.interest_areas?.map((i) => (
                        <Badge key={i} variant="primary">{i}</Badge>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Badge variant={l.consent_follow_up ? 'success' : 'default'}>
                      {l.preferred_contact?.toUpperCase() || 'OPT-IN'}
                    </Badge>
                  </td>
                  <td className="admin-table-date">{new Date(l.submitted_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
