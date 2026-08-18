import React, { useEffect } from 'react'
import { clsx } from 'clsx'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  footer?: React.ReactNode
}

const sizeClass: Record<string, string> = {
  sm: 'drawer-sm',
  md: 'drawer-md',
  lg: 'drawer-lg',
}

export function Drawer({ open, onClose, title, side = 'right', size = 'md', children, footer }: DrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx('drawer-backdrop', open && 'drawer-backdrop-open')}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Drawer'}
        className={clsx(
          'drawer-panel',
          side === 'left' ? 'drawer-left' : 'drawer-right',
          sizeClass[size],
          open ? 'drawer-open' : 'drawer-closed',
        )}
      >
        <div className="drawer-header">
          {title && <h2 className="drawer-title">{title}</h2>}
          <button onClick={onClose} className="modal-close" aria-label="Close drawer">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </>
  )
}
