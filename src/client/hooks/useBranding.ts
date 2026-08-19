/**
 * useBranding — Phase 10
 *
 * Fetches tenant branding from /api/v1/public/branding and applies
 * the colors as CSS custom properties on :root so the entire UI
 * automatically reflects the vendor's brand.
 *
 * Usage: call at the top of App.tsx or a layout component.
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export interface TenantBranding {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedColor: string
  borderColor: string
  successColor: string
  warningColor: string
  errorColor: string
  fontHeading: string
  fontBody: string
  logoUrl: string | null
  faviconUrl: string | null
  platformName: string
}

const CSS_VAR_MAP: Record<keyof TenantBranding, string | null> = {
  primaryColor:    '--color-primary',
  secondaryColor:  '--color-secondary',
  accentColor:     '--color-accent',
  backgroundColor: '--color-background',
  surfaceColor:    '--color-surface',
  textColor:       '--color-text',
  mutedColor:      '--color-muted',
  borderColor:     '--color-border',
  successColor:    '--color-success',
  warningColor:    '--color-warning',
  errorColor:      '--color-error',
  fontHeading:     '--font-heading',
  fontBody:        '--font-body',
  // non-CSS keys
  logoUrl:         null,
  faviconUrl:      null,
  platformName:    null,
}

async function fetchPublicBranding(): Promise<TenantBranding> {
  const res = await fetch('/api/v1/public/branding', { credentials: 'include' })
  const json = await res.json() as { ok: boolean; data?: TenantBranding; error?: { message: string } }
  if (!json.ok) throw new Error(json.error?.message ?? 'Failed to load branding')
  return json.data!
}

function applyBrandingToRoot(branding: TenantBranding) {
  const root = document.documentElement
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    if (!cssVar) continue
    const value = branding[key as keyof TenantBranding]
    if (typeof value === 'string' && value) {
      root.style.setProperty(cssVar, value)
    }
  }

  // Apply favicon if provided
  if (branding.faviconUrl) {
    const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (existing) {
      existing.href = branding.faviconUrl
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = branding.faviconUrl
      document.head.appendChild(link)
    }
  }

  // Update page title prefix
  if (branding.platformName) {
    document.title = `${branding.platformName} — Webinars`
  }
}

export function useBranding() {
  const query = useQuery({
    queryKey: ['public', 'branding'],
    queryFn: fetchPublicBranding,
    staleTime: 5 * 60_000,  // 5 minutes — branding changes rarely
    retry: false,            // Don't loop on network error; fall back to CSS defaults
  })

  useEffect(() => {
    if (query.data) {
      applyBrandingToRoot(query.data)
    }
  }, [query.data])

  return query
}
