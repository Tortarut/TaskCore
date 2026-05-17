import { describe, expect, it } from 'vitest'

import { parseDrfError } from './parseDrfError'

describe('parseDrfError', () => {
  it('возвращает сообщение по умолчанию без response', () => {
    expect(parseDrfError({})).toBe('Ошибка запроса.')
  })

  it('читает строковый ответ', () => {
    expect(parseDrfError({ response: { data: 'Неверные данные.' } })).toBe('Неверные данные.')
  })

  it('читает detail', () => {
    expect(parseDrfError({ response: { data: { detail: 'Нет доступа.' } } })).toBe('Нет доступа.')
  })

  it('читает поле с массивом ошибок', () => {
    expect(parseDrfError({ response: { data: { email: ['Уже занят.'] } } })).toBe('email: Уже занят.')
  })
})
