const taskStatusRu: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Готово',
  cancelled: 'Отменена',
}

const taskPriorityRu: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

export function taskStatusLabel(status: string): string {
  return taskStatusRu[status] ?? status
}

export function taskPriorityLabel(priority: string): string {
  return taskPriorityRu[priority] ?? priority
}

export function projectRoleLabel(role: string): string {
  if (role === 'manager') return 'Менеджер'
  if (role === 'member') return 'Участник'
  return role
}

const taskChangeFieldRu: Record<string, string> = {
  status: 'Статус',
  assignee_id: 'Исполнитель',
  due_date: 'Срок',
  priority: 'Приоритет',
}

export function taskChangeFieldLabel(fieldName: string): string {
  return taskChangeFieldRu[fieldName] ?? fieldName
}

/** Человекочитаемое значение в записи истории (старый/новый снимок поля). */
export function formatChangeLogValue(fieldName: string, raw: string): string {
  const v = raw.trim()
  if (v === '') return '—'
  if (fieldName === 'status') return taskStatusLabel(v)
  if (fieldName === 'priority') return taskPriorityLabel(v)
  if (fieldName === 'assignee_id') return `пользователь #${v}`
  return v
}
