/**
 * AuthContext — JWT authentication state for the React app
 *
 * Wraps the app and provides:
 *  - Current user + auth status
 *  - login() / logout() methods
 *  - Automatic token refresh (silent, via httpOnly cookie)
 *  - Redirects to login on 401
 */

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAccessToken, onUnauthorized } from '../lib/api'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const clearAuth = useCallback(() => {
    setAccessToken(null)
    setState({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  // On mount: try silent refresh to restore session
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      const result = await api.auth.refresh()
      if (cancelled) return

      if (result.ok) {
        setAccessToken(result.data.accessToken)
        const meResult = await api.auth.me()
        if (!cancelled && meResult.ok) {
          setState({ user: meResult.data.user, isAuthenticated: true, isLoading: false })
        } else {
          setState((s) => ({ ...s, isLoading: false }))
        }
      } else {
        setState((s) => ({ ...s, isLoading: false }))
      }
    }

    void restore()
    return () => { cancelled = true }
  }, [])

  // Register global unauthorized handler
  useEffect(() => {
    onUnauthorized(clearAuth)
  }, [clearAuth])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password)
    if (!result.ok) {
      return { ok: false, error: result.error.message }
    }
    setAccessToken(result.data.accessToken)
    setState({ user: result.data.user, isAuthenticated: true, isLoading: false })
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    clearAuth()
  }, [clearAuth])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
