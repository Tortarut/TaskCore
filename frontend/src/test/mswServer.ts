import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { config } from '../config'

const api = config.apiUrl.replace(/\/$/, '')

export const mockProject = {
  id: 1,
  name: 'Проект из мока',
  description: 'Описание для теста',
  owner: {
    id: 10,
    email: 'owner@test.local',
    first_name: 'Owner',
    last_name: 'Test',
    role: 'member' as const,
  },
  created_at: '2026-01-01T12:00:00Z',
  updated_at: '2026-01-01T12:00:00Z',
}

export const defaultHandlers = [
  http.get(`${api}/projects/`, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [mockProject],
    }),
  ),
]

export const server = setupServer(...defaultHandlers)
