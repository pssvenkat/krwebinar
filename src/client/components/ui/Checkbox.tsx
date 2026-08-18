import React from 'react'
import { clsx } from 'clsx'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
  error?: string
}

export function Checkbox({ label, hint, error, id, className, ...props }: CheckboxProps) {
  const inputId = id ?? `checkbox-${Math.random().toString(36).slice(2, 9)}`
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="checkbox-wrap">
      <div className="checkbox-row">
        <input
          type="checkbox"
          id={inputId}
          className={clsx('checkbox-input', error && 'checkbox-input-error', className)}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...props}
        />
        <label htmlFor={inputId} className="checkbox-label">
          {label}
        </label>
      </div>
      {hint && !error && <p className="field-hint checkbox-hint">{hint}</p>}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
}

export function Radio({ label, hint, id, className, ...props }: RadioProps) {
  const inputId = id ?? `radio-${Math.random().toString(36).slice(2, 9)}`
  return (
    <div className="checkbox-wrap">
      <div className="checkbox-row">
        <input
          type="radio"
          id={inputId}
          className={clsx('radio-input', className)}
          {...props}
        />
        <label htmlFor={inputId} className="checkbox-label">
          {label}
        </label>
      </div>
      {hint && <p className="field-hint checkbox-hint">{hint}</p>}
    </div>
  )
}

export interface RadioGroupProps {
  name: string
  label?: string
  options: Array<{ value: string; label: string; hint?: string }>
  value?: string
  onChange?: (value: string) => void
  error?: string
  required?: boolean
}

export function RadioGroup({ name, label, options, value, onChange, error, required }: RadioGroupProps) {
  const groupId = `rg-${Math.random().toString(36).slice(2, 9)}`
  const errorId = error ? `${groupId}-error` : undefined
  return (
    <fieldset className="radio-group" aria-describedby={errorId}>
      {label && (
        <legend className="field-label">
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </legend>
      )}
      <div className="radio-group-options">
        {options.map((opt) => (
          <Radio
            key={opt.value}
            name={name}
            value={opt.value}
            label={opt.label}
            hint={opt.hint}
            checked={value === opt.value}
            onChange={() => onChange?.(opt.value)}
          />
        ))}
      </div>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
