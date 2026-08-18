/**
 * useTenant — React Query hook for tenant branding + settings
 *
 * Fetches /api/v1/tenant and caches for 5 minutes.
 * Used to hydrate CSS custom properties for vendor white-labeling.
 */

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../lib/api'

export interface TenantBranding {
  logoUrl: string | null
  faviconUrl: string | null
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    muted: string
    border: string
  }
  fonts: { heading: string; body: string }
  borderRadiusBase: string
  customCss: string | null
}

export interface TenantData {
  tenant: { id: string; slug: string; name: string; planTier: string }
  branding: TenantBranding | null
  settings: {
    timezone: string
    locale: string
    supportEmail: string | null
    registrationFields: string[]
    consentPurposes: string[]
  } | null
}

export function useTenant() {
  const query = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => {
      const result = await api.tenant.get()
      if (!result.ok) throw new Error(result.error.message)
      return result.data as TenantData
    },
    staleTime: 5 * 60 * 1000,   // 5 minutes
    retry: 2,
  })

  // Apply vendor branding to CSS custom properties
  useEffect(() => {
    const branding = query.data?.branding
    if (!branding) return

    const root = document.documentElement
    const { colors } = branding

    // Apply all color tokens under [data-theme="vendor"]
    // In full impl this uses a <style> tag; here we apply to root for simplicity
    if (colors.primary)    root.style.setProperty('--color-primary',    colors.primary)
    if (colors.secondary)  root.style.setProperty('--color-secondary',  colors.secondary)
    if (colors.accent)     root.style.setProperty('--color-accent',     colors.accent)
    if (colors.background) root.style.setProperty('--color-background', colors.background)
    if (colors.surface)    root.style.setProperty('--color-surface',    colors.surface)
    if (colors.text)       root.style.setProperty('--color-text',       colors.text)
    if (colors.muted)      root.style.setProperty('--color-muted',      colors.muted)
    if (colors.border)     root.style.setProperty('--color-border',     colors.border)

    // Inject custom CSS if provided
    if (branding.customCss) {
      let styleEl = document.getElementById('vendor-custom-css')
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = 'vendor-custom-css'
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = branding.customCss
    }
  }, [query.data?.branding])

  return query
}
