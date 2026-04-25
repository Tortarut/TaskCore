import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as authApi from '../api/auth'
import { useAuth } from '../auth/AuthContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают.')
      return
    }
    setIsSubmitting(true)
    try {
      await authApi.register({
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      })
      await login(email.trim(), password)
      navigate('/app', { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data
      if (typeof msg === 'string') setError(msg)
      else if (msg?.email?.[0]) setError(String(msg.email[0]))
      else setError('Не удалось зарегистрироваться.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h2>Регистрация</h2>
        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <div className="row">
            <label className="field">
              <span>Имя</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="field">
              <span>Фамилия</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Пароль</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          <label className="field">
            <span>Повтор пароля</span>
            <input
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Создаём…' : 'Создать аккаунт'}
          </button>
        </form>
        <div className="muted">
          Уже есть аккаунт? <Link to="/login">Вход</Link>
        </div>
      </div>
    </div>
  )
}

