import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Loading } from './Loading'

describe('Loading', () => {
  it('показывает подпись по умолчанию', () => {
    render(<Loading />)
    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
  })

  it('показывает переданную подпись', () => {
    render(<Loading label="Идёт загрузка…" />)
    expect(screen.getByText('Идёт загрузка…')).toBeInTheDocument()
  })
})
