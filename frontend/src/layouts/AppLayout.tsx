import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/app" className="brand">
          TaskCore
        </Link>
        <nav className="nav">
          <NavLink to="/app/projects" className={({ isActive }) => (isActive ? 'active' : '')}>
            Проекты
          </NavLink>
          <NavLink to="/app/tasks" className={({ isActive }) => (isActive ? 'active' : '')}>
            Задачи
          </NavLink>
        </nav>
        <div className="userbox">
          <span className="user-meta">{user?.email}</span>
          <button type="button" className="btn" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

