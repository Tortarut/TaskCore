import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { Loading } from '../ui/Loading'

export function RequireAuth() {
  const { user, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

