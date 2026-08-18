import React, { useState, useCallback } from 'react'
import { clsx } from 'clsx'

export interface StarRatingProps {
  value?: number
  onChange?: (rating: number) => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  label?: string
  id?: string
}

const sizeClass: Record<string, string> = {
  sm: 'star-sm',
  md: 'star-md',
  lg: 'star-lg',
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export function StarRating({
  value = 0,
  onChange,
  max = 5,
  size = 'md',
  readonly = false,
  label = 'Rating',
  id,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const groupId = id ?? `stars-${Math.random().toString(36).slice(2, 7)}`
  const display = hovered || value

  const handleKey = useCallback(
    (e: React.KeyboardEvent, star: number) => {
      if (readonly) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault()
        onChange?.(Math.min(max, star + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault()
        onChange?.(Math.max(1, star - 1))
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onChange?.(star)
      }
    },
    [max, onChange, readonly],
  )

  return (
    <div className="star-rating">
      <fieldset>
        <legend className="sr-only">{label}</legend>
        <div
          id={groupId}
          className={clsx('star-group', sizeClass[size])}
          role="group"
          aria-label={`${label}: ${value} of ${max}`}
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
            <button
              key={star}
              type="button"
              disabled={readonly}
              className={clsx(
                'star-btn',
                star <= display ? 'star-filled' : 'star-empty',
                !readonly && 'star-interactive',
              )}
              aria-label={`${LABELS[star] ?? star} — ${star} star${star !== 1 ? 's' : ''}`}
              aria-pressed={star === value}
              onClick={() => !readonly && onChange?.(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              onMouseLeave={() => !readonly && setHovered(0)}
              onKeyDown={(e) => handleKey(e, star)}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      {hovered > 0 && !readonly && (
        <span className="star-label" aria-live="polite">{LABELS[hovered]}</span>
      )}
    </div>
  )
}
