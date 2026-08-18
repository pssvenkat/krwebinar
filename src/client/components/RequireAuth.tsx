/**
 * RequireAuth — Redirect to /admin/login if not authenticated.
 * Shows a loading spinner during session restore.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingState } from './ui/States'

interface RequireAuthProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function RequireAuth({ children, redirectTo = '/admin/login' }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--color-background)',
      }}>
        <LoadingState label="Restoring session…" size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
