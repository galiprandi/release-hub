import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SekiTimeline } from './SekiTimeline'
import type { SekiPipelineEvent } from '../types'

describe('SekiTimeline', () => {
  const createMockEvents = (): SekiPipelineEvent[] => [
    {
      id: 'event-1',
      name: 'Checkout',
      state: 'COMPLETED',
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
    },
    {
      id: 'event-2',
      name: 'Build',
      state: 'RUNNING',
      startedAt: '2024-01-01T00:01:00Z',
    },
    {
      id: 'event-3',
      name: 'Test',
      state: 'IDLE',
    },
    {
      id: 'event-4',
      name: 'Deploy',
      state: 'FAILED',
      startedAt: '2024-01-01T00:05:00Z',
      completedAt: '2024-01-01T00:06:00Z',
    },
    {
      id: 'event-5',
      name: 'Cleanup',
      state: 'CANCELLED',
    },
    {
      id: 'event-6',
      name: 'Notify',
      state: 'STARTED',
      startedAt: '2024-01-01T00:10:00Z',
    },
  ]

  it('renders timeline with events', () => {
    const events = createMockEvents()
    render(<SekiTimeline events={events} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
  })

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup()
    const events = createMockEvents()
    render(<SekiTimeline events={events} />)

    const buttons = screen.getAllByRole('button')
    await user.hover(buttons[0])

    expect(await screen.findByText('Checkout')).toBeInTheDocument()
  })

  it('renders empty timeline with no events', () => {
    render(<SekiTimeline events={[]} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('limits display to first 6 events', () => {
    const manyEvents: SekiPipelineEvent[] = Array.from({ length: 10 }, (_, i) => ({
      id: `event-${i}`,
      name: `Step ${i}`,
      state: 'COMPLETED' as const,
    }))

    render(<SekiTimeline events={manyEvents} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
    expect(screen.getByText('+4 más')).toBeInTheDocument()
  })
})
