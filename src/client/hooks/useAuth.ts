/**
 * useAuth — convenience hook wrapping AuthContext
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout, isLoading } = useAuth()
 */

import { useAuthContext } from '../contexts/AuthContext'
export { useAuthContext as useAuth }
