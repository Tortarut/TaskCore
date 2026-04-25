import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequireAuth } from './RequireAuth'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'

function Placeholder({ title }: { title: string }) {
  return <div style={{ padding: 24 }}>{title}</div>
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Placeholder title="Dashboard (todo)" /> },
          { path: 'projects', element: <Placeholder title="Projects (todo)" /> },
          { path: 'tasks', element: <Placeholder title="Tasks (todo)" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Placeholder title="Not found" /> },
])

