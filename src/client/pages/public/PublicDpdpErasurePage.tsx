/**
 * PublicDpdpErasurePage — Attendee DPDP Data Erasure Request Portal
 *
 * Dedicated public portal for attendees to exercise their Right to Erasure /
 * Right to be Forgotten under the Digital Personal Data Protection (DPDP) Act 2023.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'

export default function PublicDpdpErasurePage() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [submittedData, setSubmittedData] = useState<{
    requestId: string
    submittedAt: string
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const erasureMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null)
      const cleanEmail = email.trim()
      const cleanPhone = phone.trim()

      if (!cleanEmail && !cleanPhone) {
        throw new Error('Please enter at least your Email address or Phone number.')
      }

      const res = await api.privacy.submitPublicErasureRequest({
        email: cleanEmail || undefined,
        phone: cleanPhone || undefined,
        reason: reason.trim() || undefined,
      })

      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: (data) => {
      setSubmittedData({
        requestId: data.requestId,
        submittedAt: data.submittedAt,
      })
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    },
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            Data Erasure Request
          </h1>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
            Digital Personal Data Protection (DPDP) Act 2023 &amp; Privacy Compliance
          </p>
        </div>

        {submittedData ? (
          /* Confirmation Screen */
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '16px',
              padding: '1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '2rem' }}>✅</div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
              Erasure Request Received
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#14532d', lineHeight: 1.6 }}>
              Your request to delete personal data associated with{' '}
              <strong>{email || phone}</strong> has been logged in our privacy queue.
            </p>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #dcfce7',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                color: '#166534',
                textAlign: 'left',
              }}
            >
              <div>
                <strong>Reference ID:</strong> {submittedData.requestId}
              </div>
              <div>
                <strong>Submitted At:</strong> {new Date(submittedData.submittedAt).toLocaleString()}
              </div>
              <div>
                <strong>Status:</strong> Pending Verification &amp; Purge
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#4b7c59', lineHeight: 1.5 }}>
              Under DPDP Act compliance, our data protection officer will verify and permanently purge your
              webinar registrations, feedback, and marketing records.
            </p>

            <Link to="/" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
              <Button variant="primary" size="md">
                Return to Homepage
              </Button>
            </Link>
          </div>
        ) : (
          /* Submission Form */
          <>
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '0.85rem',
                color: '#1e40af',
                lineHeight: 1.5,
              }}
            >
              You have the right to request deletion of your personal identifiers (name, email, phone number,
              event attendance logs, and survey feedback). Please enter your details below.
            </div>

            {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                erasureMutation.mutate()
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.35rem',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your.name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.95rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                  The email address used when registering for webinars.
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.35rem',
                  }}
                >
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.95rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                  Include country code (e.g. +91 for India).
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.35rem',
                  }}
                >
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Withdrawing marketing consent / Requesting complete right to be forgotten…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.95rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={erasureMutation.isPending}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  marginTop: '0.5rem',
                }}
              >
                {erasureMutation.isPending ? 'Submitting Request…' : 'Submit Deletion Request'}
              </Button>
            </form>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <Link
            to="/"
            style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
