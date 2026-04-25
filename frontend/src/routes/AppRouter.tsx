import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequireAuth } from './RequireAuth'

function Placeholder({ title }: { title: string }) {
  return <div style={{ padding: 24 }}>{title}</div>
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/login', element: <Placeholder title="Login (todo)" /> },
  { path: '/register', element: <Placeholder title="Register (todo)" /> },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      { index: true, element: <Placeholder title="Dashboard (todo)" /> },
      { path: 'projects', element: <Placeholder title="Projects (todo)" /> },
      { path: 'tasks', element: <Placeholder title="Tasks (todo)" /> },
    ],
  },
  { path: '*', element: <Placeholder title="Not found" /> },
])

