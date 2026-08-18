import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}

export interface LoadingStateProps {
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ label = 'Loading…', size = 'md' }: LoadingStateProps) {
  const spinnerSize: Record<string, number> = { sm: 20, md: 32, lg: 48 }
  const sz = spinnerSize[size]

  return (
    <div className="loading-state" role="status" aria-label={label}>
      <svg
        width={sz}
        height={sz}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="var(--color-border)" strokeWidth="3" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <p className="loading-state-label">{label}</p>
    </div>
  )
}

export interface ErrorStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
  error?: Error | string
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  action,
  error,
}: ErrorStateProps) {
  const msg = description ?? (error instanceof Error ? error.message : error)
  return (
    <div className="error-state" role="alert">
      <div className="error-state-icon" aria-hidden="true">⚠️</div>
      <h3 className="error-state-title">{title}</h3>
      {msg && <p className="error-state-description">{msg}</p>}
      {action && <div className="error-state-action">{action}</div>}
    </div>
  )
}
