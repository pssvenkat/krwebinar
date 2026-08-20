import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBranding } from '../../hooks/useBranding'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'

export default function AdminLoginPage() {
  const { login } = useAuth()
  const { data: branding } = useBranding()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.ok) {
        if (result.user?.role === 'PLATFORM_OWNER') {
          navigate('/platform/tenants', { replace: true })
        } else {
          navigate('/admin', { replace: true })
        }
      } else {
        setError(result.error ?? 'Login failed. Check your credentials.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.platformName || 'Logo'}
              style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain', marginBottom: '0.5rem' }}
            />
          ) : (
            <div className="admin-login-logo-icon">🌱</div>
          )}
          <h1 className="admin-login-title">{branding?.platformName ? `${branding.platformName} Admin` : 'Admin Portal'}</h1>
          <p className="admin-login-subtitle">Sign in to manage your webinars</p>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
          <Input
            id="login-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="admin@yourbrand.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
          <Input
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
          <Button
            id="login-submit"
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="admin-login-btn"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="admin-login-footer">
          🔒 Protected by JWT + PBKDF2. Session expires after 15 minutes of inactivity.
        </p>
      </div>
    </div>
  )
}
