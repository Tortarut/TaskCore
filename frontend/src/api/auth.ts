import { http } from './http'
import { getTokens } from '../auth/tokens'

export type LoginResponse = {
  access: string
  refresh: string
  user: {
    id: number
    email: string
    first_name: string
    last_name: string
    role: 'admin' | 'manager' | 'member'
    is_active: boolean
    date_joined: string
  }
}

export async function login(email: string, password: string) {
  const res = await http.post<LoginResponse>('/auth/token/', { email, password })
  return res.data
}

export async function register(payload: {
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
  role?: 'manager' | 'member'
}) {
  const res = await http.post('/auth/register/', payload)
  return res.data
}

export async function me() {
  const res = await http.get('/users/me/')
  return res.data
}

export async function logout() {
  const refresh = getTokens()?.refresh
  await http.post('/auth/logout/', refresh ? { refresh } : {})
}

