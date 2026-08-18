import React from 'react'
import { clsx } from 'clsx'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  fullWidth?: boolean
  showCount?: boolean
  maxLength?: number
}

export function Textarea({
  label,
  hint,
  error,
  fullWidth = true,
  showCount = false,
  maxLength,
  id,
  value,
  className,
  ...props
}: TextareaProps) {
  const inputId = id ?? `textarea-${Math.random().toString(36).slice(2, 9)}`
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const charCount = typeof value === 'string' ? value.length : 0

  return (
    <div className={clsx('field', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {props.required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={clsx('field-input field-textarea', error && 'field-input-error', className)}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        maxLength={maxLength}
        value={value}
        {...props}
      />
      <div className="field-footer">
        <div>
          {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
          {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
        </div>
        {showCount && maxLength && (
          <span className={clsx('field-count', charCount >= maxLength && 'field-count-max')}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
