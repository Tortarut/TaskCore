import { describe, expect, it } from 'vitest'

import {
  formatChangeLogValue,
  projectRoleLabel,
  taskChangeFieldLabel,
  taskPriorityLabel,
  taskStatusLabel,
} from './labels'

describe('labels', () => {
  it('переводит известные статусы задач', () => {
    expect(taskStatusLabel('todo')).toBe('К выполнению')
    expect(taskStatusLabel('in_progress')).toBe('В работе')
    expect(taskStatusLabel('unknown')).toBe('unknown')
  })

  it('переводит приоритеты', () => {
    expect(taskPriorityLabel('high')).toBe('Высокий')
  })

  it('переводит роли в проекте', () => {
    expect(projectRoleLabel('manager')).toBe('Менеджер')
    expect(projectRoleLabel('member')).toBe('Участник')
  })

  it('переводит имена полей журнала', () => {
    expect(taskChangeFieldLabel('status')).toBe('Статус')
  })

  it('форматирует значения журнала', () => {
    expect(formatChangeLogValue('status', 'todo')).toBe('К выполнению')
    expect(formatChangeLogValue('priority', 'high')).toBe('Высокий')
    expect(formatChangeLogValue('assignee_id', '5')).toBe('пользователь #5')
    expect(formatChangeLogValue('due_date', '')).toBe('—')
  })
})
