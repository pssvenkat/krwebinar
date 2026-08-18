import React from 'react'
import { clsx } from 'clsx'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  fullWidth = true,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={clsx('field', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {props.required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="field-input-wrap">
        {leftIcon && <span className="field-icon field-icon-left" aria-hidden="true">{leftIcon}</span>}
        <input
          id={inputId}
          className={clsx(
            'field-input',
            leftIcon && 'field-input-pl',
            rightIcon && 'field-input-pr',
            error && 'field-input-error',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
        {rightIcon && <span className="field-icon field-icon-right" aria-hidden="true">{rightIcon}</span>}
      </div>
      {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  )
}
