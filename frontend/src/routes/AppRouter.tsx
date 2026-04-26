import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequireAuth } from './RequireAuth'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ProjectsPage } from '../pages/ProjectsPage'
import { TasksPage } from '../pages/TasksPage'
import { ProjectPage } from '../pages/ProjectPage'
import { TaskPage } from '../pages/TaskPage'

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
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:id', element: <ProjectPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: 'tasks/:id', element: <TaskPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Placeholder title="Not found" /> },
])

