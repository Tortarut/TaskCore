import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'

import { clearTokens, getTokens, setTokens } from '../auth/tokens'
import { config } from '../config'

export const http = axios.create({
  baseURL: config.apiUrl,
})

http.interceptors.request.use((req: InternalAxiosRequestConfig) => {
  const tokens = getTokens()
  if (tokens?.access) {
    req.headers = req.headers ?? {}
    req.headers.Authorization = `Bearer ${tokens.access}`
  }
  return req
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise
  const tokens = getTokens()
  if (!tokens?.refresh) throw new Error('No refresh token')

  refreshPromise = (async () => {
    const res = await axios.post<{ access: string }>(`${config.apiUrl}/auth/token/refresh/`, {
      refresh: tokens.refresh,
    })
    const next = { access: res.data.access, refresh: tokens.refresh }
    setTokens(next)
    return next.access
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const axiosError = error as AxiosError
    const original = axiosError.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = axiosError?.response?.status
    if (!original || status !== 401 || original._retry) throw error

    original._retry = true
    try {
      const access = await refreshAccessToken()
      original.headers = (original.headers ?? {}) as AxiosRequestConfig['headers']
      ;(original.headers as any).Authorization = `Bearer ${access}`
      return await http.request(original)
    } catch (e) {
      clearTokens()
      throw error
    }
  },
)

