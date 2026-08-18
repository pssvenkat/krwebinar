// React is used implicitly via JSX transform
import { clsx } from 'clsx'

export type ProgressVariant = 'default' | 'success' | 'warning' | 'error'

export interface ProgressProps {
  value: number        // 0–100
  max?: number
  variant?: ProgressVariant
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
  animated?: boolean
  className?: string
}

const variantClass: Record<ProgressVariant, string> = {
  default: 'progress-default',
  success: 'progress-success',
  warning: 'progress-warning',
  error: 'progress-error',
}

const sizeClass: Record<string, string> = {
  sm: 'progress-sm',
  md: 'progress-md',
  lg: 'progress-lg',
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  label,
  showValue = false,
  animated = false,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={clsx('progress-wrap', className)}>
      {(label || showValue) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showValue && <span className="progress-value">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className={clsx('progress-track', sizeClass[size])}
      >
        <div
          className={clsx('progress-fill', variantClass[variant], animated && 'progress-animated')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
