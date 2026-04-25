import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import * as authApi from '../api/auth'
import { clearTokens, getTokens, setTokens } from './tokens'

export type AuthUser = authApi.LoginResponse['user']

type AuthState = {
  user: AuthUser | null
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const tokens = getTokens()
    if (!tokens) {
      setIsReady(true)
      return
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        clearTokens()
        setUser(null)
      })
      .finally(() => setIsReady(true))
  }, [])

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password)
    setTokens({ access: data.access, refresh: data.refresh })
    setUser(data.user)
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clearTokens()
      setUser(null)
    }
  }

  const value = useMemo<AuthState>(() => ({ user, isReady, login, logout }), [user, isReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

