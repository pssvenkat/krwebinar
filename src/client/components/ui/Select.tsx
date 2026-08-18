import React from 'react'
import { clsx } from 'clsx'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
}

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  fullWidth = true,
  id,
  className,
  ...props
}: SelectProps) {
  const inputId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined
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
        <select
          id={inputId}
          className={clsx('field-input field-select', error && 'field-input-error', className)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="field-select-arrow" aria-hidden="true">▾</span>
      </div>
      {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  )
}
