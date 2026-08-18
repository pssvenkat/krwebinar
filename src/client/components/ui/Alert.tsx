import React from 'react'
import { clsx } from 'clsx'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

const variantClass: Record<AlertVariant, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
}

const iconMap: Record<AlertVariant, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
}

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={clsx('alert', variantClass[variant], className)}
    >
      <span className="alert-icon" aria-hidden="true">{iconMap[variant]}</span>
      <div className="alert-content">
        {title && <p className="alert-title">{title}</p>}
        <div className="alert-body">{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="alert-close" aria-label="Dismiss alert">✕</button>
      )}
    </div>
  )
}
