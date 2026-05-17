import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { config } from '../config'
import { mockProject } from '../test/mswServer'
import { server } from '../test/mswServer'
import { ProjectsPage } from './ProjectsPage'

const api = config.apiUrl.replace(/\/$/, '')

function renderProjectsPage() {
  return render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )
}

describe('ProjectsPage (MSW)', () => {
  it('отображает проекты из подменённого API', async () => {
    renderProjectsPage()

    expect(screen.getByText('Загрузка…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(mockProject.name)).toBeInTheDocument()
    })

    expect(screen.getByText(/Создано: owner@test\.local/)).toBeInTheDocument()
    expect(screen.queryByText('Загрузка…')).not.toBeInTheDocument()
  })

  it('показывает ошибку при ответе сервера с detail', async () => {
    server.use(
      http.get(`${api}/projects/`, () =>
        HttpResponse.json({ detail: 'Сервер недоступен.' }, { status: 503 }),
      ),
    )

    renderProjectsPage()

    await waitFor(() => {
      expect(screen.getByText('Сервер недоступен.')).toBeInTheDocument()
    })
  })
})
