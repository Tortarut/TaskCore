import { http } from './http'

export type UserListItem = {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'manager' | 'member'
}

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] }

export async function searchUsers(search: string, page = 1) {
  const qs = new URLSearchParams()
  if (search) qs.set('search', search)
  qs.set('page', String(page))
  const res = await http.get<Page<UserListItem>>(`/users/?${qs.toString()}`)
  return res.data
}

