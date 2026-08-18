import React from 'react'
import { clsx } from 'clsx'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat'

export interface CardProps {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
  onClick?: () => void
  as?: React.ElementType
}

const variantClass: Record<CardVariant, string> = {
  default: 'card',
  elevated: 'card card-elevated',
  outlined: 'card card-outlined',
  flat: 'card card-flat',
}

const paddingClass: Record<string, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
  as: As = 'div',
}: CardProps) {
  return (
    <As
      className={clsx(variantClass[variant], paddingClass[padding], onClick && 'card-clickable', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </As>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('card-header', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={clsx('card-title', className)}>{children}</h3>
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx('card-description', className)}>{children}</p>
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('card-content', className)}>{children}</div>
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('card-footer', className)}>{children}</div>
}
