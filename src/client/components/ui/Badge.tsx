import React from 'react'
import { clsx } from 'clsx'

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const variantClass: Record<BadgeVariant, string> = {
  default: 'badge badge-default',
  primary: 'badge badge-primary',
  secondary: 'badge badge-secondary',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  error: 'badge badge-error',
  info: 'badge badge-info',
  outline: 'badge badge-outline',
}

const sizeClass: Record<BadgeSize, string> = {
  sm: 'badge-sm',
  md: 'badge-md',
}

export function Badge({ variant = 'default', size = 'md', dot = false, children, className }: BadgeProps) {
  return (
    <span className={clsx(variantClass[variant], sizeClass[size], className)}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Convenience badges for webinar status */
export function WebinarStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    DRAFT: 'default',
    PUBLISHED: 'primary',
    LIVE: 'success',
    ENDED: 'warning',
    ARCHIVED: 'outline',
  }
  return (
    <Badge variant={map[status] ?? 'default'} dot={status === 'LIVE'}>
      {status}
    </Badge>
  )
}
