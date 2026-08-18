import React, { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'

export interface DropdownItem {
  label?: string
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  separator?: boolean
}

export interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={ref} className={clsx('dropdown', className)} style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      {open && (
        <div
          role="menu"
          className={clsx('dropdown-menu', align === 'right' && 'dropdown-menu-right', 'animate-fade-in')}
        >
          {items.map((item, i) =>
            item.separator ? (
              <hr key={i} className="dropdown-separator" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { item.onClick?.(); setOpen(false) }}
                className={clsx('dropdown-item', item.danger && 'dropdown-item-danger', item.disabled && 'dropdown-item-disabled')}
              >
                {item.icon && <span className="dropdown-item-icon" aria-hidden="true">{item.icon}</span>}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
