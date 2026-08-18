/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useState } from 'react'
import { clsx } from 'clsx'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: (item: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const duration = item.duration ?? 4000
      setToasts((prev) => [...prev, { ...item, id }])
      if (duration > 0) setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const iconMap: Record<ToastVariant, string> = {
  default: 'ℹ',
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const variantClass: Record<ToastVariant, string> = {
  default: 'toast-default',
  success: 'toast-success',
  error: 'toast-error',
  warning: 'toast-warning',
  info: 'toast-info',
}

function ToastContainer({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={clsx('toast', variantClass[t.variant ?? 'default'], 'animate-slide-up')}
        >
          <span className="toast-icon" aria-hidden="true">{iconMap[t.variant ?? 'default']}</span>
          <div className="toast-content">
            <p className="toast-title">{t.title}</p>
            {t.description && <p className="toast-description">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="toast-close" aria-label="Dismiss notification">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
