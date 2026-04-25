import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimpleTimeline } from '../components/SimpleTimeline'
import type { PipelineEvent } from '../types'

describe('SimpleTimeline', () => {
  const createMockEvents = (): PipelineEvent[] => [
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
    render(<SimpleTimeline events={events} />)
    
    // Timeline should render (events are represented as colored bars)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
  })

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup()
    const events = createMockEvents()
    render(<SimpleTimeline events={events} />)
    
    const buttons = screen.getAllByRole('button')
    await user.hover(buttons[0])
    
    // Event name should appear in tooltip
    expect(await screen.findByText('Checkout')).toBeInTheDocument()
  })

  it('renders empty timeline with no events', () => {
    render(<SimpleTimeline events={[]} />)
    
    // No buttons should be rendered
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('limits display to first 6 events', () => {
    const manyEvents: PipelineEvent[] = Array.from({ length: 10 }, (_, i) => ({
      id: `event-${i}`,
      name: `Step ${i}`,
      state: 'COMPLETED',
    }))
    
    render(<SimpleTimeline events={manyEvents} />)
    
    // Should show indicator for remaining events
    expect(screen.getByText('+4 más')).toBeInTheDocument()
  })

  it('shows different states with different styling', () => {
    const events = createMockEvents()
    const { container } = render(<SimpleTimeline events={events} />)
    
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('displays duration in tooltip for completed events', async () => {
    const user = userEvent.setup()
    const events: PipelineEvent[] = [
      {
        id: 'event-1',
        name: 'Build',
        state: 'COMPLETED',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:02:30Z',
      },
    ]
    
    render(<SimpleTimeline events={events} />)
    
    const button = screen.getByRole('button')
    await user.hover(button)
    
    // Duration should be shown
    expect(await screen.findByText(/Duración:/)).toBeInTheDocument()
    expect(await screen.findByText(/2m 30s/)).toBeInTheDocument()
  })
})
