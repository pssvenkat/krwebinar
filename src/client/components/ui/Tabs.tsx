import React, { useState, createContext, useContext } from 'react'
import { clsx } from 'clsx'

interface TabsContextValue {
  active: string
  setActive: (id: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab components must be used inside <Tabs>')
  return ctx
}

export interface TabsProps {
  defaultTab: string
  children: React.ReactNode
  className?: string
}

export function Tabs({ defaultTab, children, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={clsx('tabs', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export interface TabListProps {
  children: React.ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div role="tablist" className={clsx('tab-list', className)}>
      {children}
    </div>
  )
}

export interface TabProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
}

export function Tab({ id, children, disabled = false }: TabProps) {
  const { active, setActive } = useTabsContext()
  const isActive = active === id

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tab-panel-${id}`}
      id={`tab-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      className={clsx('tab', isActive && 'tab-active', disabled && 'tab-disabled')}
      onClick={() => !disabled && setActive(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) setActive(id) }
      }}
    >
      {children}
    </button>
  )
}

export interface TabPanelProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { active } = useTabsContext()
  if (active !== id) return null
  return (
    <div
      role="tabpanel"
      id={`tab-panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={clsx('tab-panel', className)}
    >
      {children}
    </div>
  )
}
