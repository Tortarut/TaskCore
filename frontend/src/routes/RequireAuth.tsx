import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

export function RequireAuth() {
  const { user, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

