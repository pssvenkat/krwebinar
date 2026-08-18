import React, { useMemo } from 'react'
import { clsx } from 'clsx'

export interface CountryOption {
  code: string      // ISO 3166-1 alpha-2
  name: string
  flag: string      // emoji flag
}

export interface CountrySelectProps {
  value?: string
  onChange?: (code: string, name: string) => void
  label?: string
  hint?: string
  error?: string
  required?: boolean
  placeholder?: string
  id?: string
  fullWidth?: boolean
  priorityCountries?: string[]
}

const DEFAULT_PRIORITY: string[] = ['IN', 'US', 'GB', 'AE', 'AU', 'CA', 'SG', 'MY', 'PH', 'ZA']

function getFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

function buildCountryList(priority: string[]): CountryOption[] {
  const names = new Intl.DisplayNames(['en'], { type: 'region' })
  // Curated ISO 3166-1 alpha-2 codes — covers 249 countries
  const ALL_CODES = [
    'AF','AX','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT',
    'AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BM','BT','BO','BQ','BA','BW',
    'BV','BR','IO','BN','BG','BF','BI','CV','KH','CM','CA','KY','CF','TD','CL',
    'CN','CX','CC','CO','KM','CG','CD','CK','CR','CI','HR','CU','CW','CY','CZ',
    'DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FK','FO','FJ',
    'FI','FR','GF','PF','TF','GA','GM','GE','DE','GH','GI','GR','GL','GD','GP',
    'GU','GT','GG','GN','GW','GY','HT','HM','VA','HN','HK','HU','IS','IN','ID',
    'IR','IQ','IE','IM','IL','IT','JM','JP','JE','JO','KZ','KE','KI','KP','KR',
    'KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MO','MG','MW','MY',
    'MV','ML','MT','MH','MQ','MR','MU','YT','MX','FM','MD','MC','MN','ME','MS',
    'MA','MZ','MM','NA','NR','NP','NL','NC','NZ','NI','NE','NG','NU','NF','MK',
    'MP','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PN','PL','PT','PR',
    'QA','RE','RO','RU','RW','BL','SH','KN','LC','MF','PM','VC','WS','SM','ST',
    'SA','SN','RS','SC','SL','SG','SX','SK','SI','SB','SO','ZA','GS','SS','ES',
    'LK','SD','SR','SJ','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TK','TO',
    'TT','TN','TR','TM','TC','TV','UG','UA','AE','GB','US','UM','UY','UZ','VU',
    'VE','VN','VG','VI','WF','EH','YE','ZM','ZW',
  ]

  const make = (code: string): CountryOption | null => {
    const name = names.of(code)
    if (!name) return null
    return { code, name, flag: getFlag(code) }
  }

  const priorityItems = priority.map(make).filter((x): x is CountryOption => x !== null)
  const priorityCodes = new Set(priority)
  const rest = ALL_CODES
    .filter((c) => !priorityCodes.has(c))
    .map(make)
    .filter((x): x is CountryOption => x !== null)
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...priorityItems, ...rest]
}

export function CountrySelect({
  value,
  onChange,
  label,
  hint,
  error,
  required,
  placeholder = 'Select country',
  id,
  fullWidth = true,
  priorityCountries = DEFAULT_PRIORITY,
}: CountrySelectProps) {
  const inputId = id ?? `country-${Math.random().toString(36).slice(2, 9)}`
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  const countries = useMemo(() => buildCountryList(priorityCountries), [priorityCountries])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value
    const name = countries.find((c) => c.code === code)?.name ?? code
    onChange?.(code, name)
  }

  return (
    <div className={clsx('field', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="field-input-wrap">
        <select
          id={inputId}
          value={value ?? ''}
          onChange={handleChange}
          className={clsx('field-input field-select', error && 'field-input-error')}
          aria-invalid={!!error}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          required={required}
        >
          <option value="" disabled>{placeholder}</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
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
