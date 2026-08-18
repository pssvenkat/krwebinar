import React, { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  footer?: React.ReactNode
  hideClose?: boolean
}

const sizeClass: Record<string, string> = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
  xl: 'modal-xl',
  full: 'modal-full',
}

export function Modal({ open, onClose, title, description, size = 'md', children, footer, hideClose = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  // Lock scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      firstFocusRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const dialogId = `modal-${Math.random().toString(36).slice(2, 7)}`
  const descId = description ? `${dialogId}-desc` : undefined

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? dialogId : undefined}
        aria-describedby={descId}
        className={clsx('modal-panel', sizeClass[size])}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="modal-header">
            {title && <h2 id={dialogId} className="modal-title">{title}</h2>}
            {description && <p id={descId} className="modal-description">{description}</p>}
            {!hideClose && (
              <button
                ref={firstFocusRef}
                onClick={onClose}
                className="modal-close"
                aria-label="Close dialog"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
