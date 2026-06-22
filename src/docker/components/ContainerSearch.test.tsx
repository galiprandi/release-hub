import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContainerSearch } from './ContainerSearch'

describe('ContainerSearch', () => {
  it('renders correctly with placeholder', () => {
    render(<ContainerSearch query="" setQuery={() => {}} placeholder="Test placeholder" />)
    expect(screen.getByPlaceholderText('Test placeholder')).toBeDefined()
  })

  it('calls setQuery on change', () => {
    const setQuery = vi.fn()
    render(<ContainerSearch query="" setQuery={setQuery} />)
    const input = screen.getByPlaceholderText('Buscar contenedor...')
    fireEvent.change(input, { target: { value: 'test-container' } })
    expect(setQuery).toHaveBeenCalledWith('test-container')
  })

  it('shows clear button when query is present and clears on click', () => {
    const setQuery = vi.fn()
    render(<ContainerSearch query="my-query" setQuery={setQuery} />)
    const clearButton = screen.getByLabelText('Limpiar búsqueda')
    expect(clearButton).toBeDefined()
    fireEvent.click(clearButton)
    expect(setQuery).toHaveBeenCalledWith('')
  })
})
