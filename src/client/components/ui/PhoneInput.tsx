import React, { useState } from 'react'
import { parsePhoneNumberFromString, AsYouType, getCountries, getCountryCallingCode } from 'libphonenumber-js'
import type { CountryCode } from 'libphonenumber-js'
import { clsx } from 'clsx'

export interface PhoneInputProps {
  value?: string          // E.164 e.g. "+919876543210"
  onChange?: (e164: string, isValid: boolean) => void
  label?: string
  error?: string
  hint?: string
  required?: boolean
  defaultCountry?: CountryCode
  id?: string
  fullWidth?: boolean
}

const FLAG_EMOJI: Record<string, string> = {}
// Build flag emoji from country code
function getFlag(code: string): string {
  if (FLAG_EMOJI[code]) return FLAG_EMOJI[code]
  const flag = code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
  FLAG_EMOJI[code] = flag
  return flag
}

// Popular countries shown first
const PRIORITY_COUNTRIES: CountryCode[] = ['IN', 'US', 'GB', 'AE', 'AU', 'CA', 'SG', 'MY']

function getCountryOptions(): Array<{ code: CountryCode; name: string; dialCode: string }> {
  const names = new Intl.DisplayNames(['en'], { type: 'region' })
  const all = getCountries()

  const makeOption = (code: CountryCode) => ({
    code,
    name: names.of(code) ?? code,
    dialCode: `+${getCountryCallingCode(code)}`,
  })

  const priority = PRIORITY_COUNTRIES.map(makeOption)
  const rest = all
    .filter((c): c is CountryCode => !PRIORITY_COUNTRIES.includes(c as CountryCode))
    .map(makeOption)
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...priority, ...rest]
}

const COUNTRY_OPTIONS = getCountryOptions()

export function PhoneInput({
  value = '',
  onChange,
  label,
  error,
  hint,
  required,
  defaultCountry = 'IN',
  id,
  fullWidth = true,
}: PhoneInputProps) {
  const inputId = id ?? `phone-${Math.random().toString(36).slice(2, 9)}`
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  // Detect country from incoming E.164 value, or use default
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    if (value) {
      const parsed = parsePhoneNumberFromString(value)
      return (parsed?.country as CountryCode) ?? defaultCountry
    }
    return defaultCountry
  })

  const [displayValue, setDisplayValue] = useState(() => {
    if (value) {
      const parsed = parsePhoneNumberFromString(value)
      return parsed ? parsed.formatNational() : value
    }
    return ''
  })

  const dialCode = `+${getCountryCallingCode(selectedCountry)}`

  const handleCountryChange = (code: CountryCode) => {
    setSelectedCountry(code)
    setDisplayValue('')
    onChange?.('', false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const formatter = new AsYouType(selectedCountry)
    const formatted = formatter.input(raw.replace(/[^0-9]/g, ''))
    setDisplayValue(formatted)

    const full = `+${getCountryCallingCode(selectedCountry)}${raw.replace(/[^0-9]/g, '')}`
    const parsed = parsePhoneNumberFromString(full, selectedCountry)
    const isValid = parsed?.isValid() ?? false
    const e164 = parsed?.format('E.164') ?? ''
    onChange?.(e164, isValid)
  }

  const selectedOption = COUNTRY_OPTIONS.find((o) => o.code === selectedCountry)

  return (
    <div className={clsx('field', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={clsx('phone-input-wrap', error && 'phone-input-wrap-error')}>
        {/* Country selector */}
        <div className="phone-country-select">
          <select
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
            aria-label="Select country code"
            className="phone-country-dropdown"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {getFlag(opt.code)} {opt.name} ({opt.dialCode})
              </option>
            ))}
          </select>
          <div className="phone-country-display" aria-hidden="true">
            <span>{getFlag(selectedCountry)}</span>
            <span className="phone-dial-code">{selectedOption?.dialCode}</span>
            <span className="phone-chevron">▾</span>
          </div>
        </div>

        <div className="phone-divider" aria-hidden="true" />

        {/* Number input */}
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={displayValue}
          onChange={handleInputChange}
          placeholder="Phone number"
          className="phone-number-input"
          aria-invalid={!!error}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          required={required}
        />
      </div>
      {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
      <p className="field-hint" aria-live="polite">
        Format: {dialCode} + national number
      </p>
    </div>
  )
}
