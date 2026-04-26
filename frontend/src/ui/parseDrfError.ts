export function parseDrfError(err: any): string {
  const data = err?.response?.data
  if (!data) return 'Ошибка запроса.'

  if (typeof data === 'string') return data
  if (typeof data?.detail === 'string') return data.detail

  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') return `${key}: ${value}`
      if (Array.isArray(value) && typeof value[0] === 'string') return `${key}: ${value[0]}`
    }
  }
  try {
    return JSON.stringify(data)
  } catch {
    return 'Ошибка запроса.'
  }
}

