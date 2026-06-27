import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SekiPipelineCard } from './SekiPipelineCard'
import type { SekiPipelineCardProps } from './SekiPipelineCard'
import type { MetaPart } from '../types'

describe('SekiPipelineCard', () => {
  const defaultProps: SekiPipelineCardProps = {
    viewMode: 'commits',
    displayRef: 'abc1234',
    refType: 'COMMIT',
    isRunning: false,
    metaParts: [],
  }

  it('renders with basic props', () => {
    render(<SekiPipelineCard {...defaultProps} />)

    expect(screen.getByText('abc1234')).toBeInTheDocument()
    expect(screen.getByText('COMMIT')).toBeInTheDocument()
  })

  it('renders tag ref type for tags', () => {
    render(
      <SekiPipelineCard
        {...defaultProps}
        viewMode="tags"
        displayRef="v1.0.0"
        refType="TAG"
      />
    )

    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('TAG')).toBeInTheDocument()
  })

  it('shows running indicator when isRunning is true', () => {
    render(<SekiPipelineCard {...defaultProps} isRunning={true} />)

    expect(screen.getByText('EN PROGRESO')).toBeInTheDocument()
  })

  it('does not show running indicator when isRunning is false', () => {
    render(<SekiPipelineCard {...defaultProps} isRunning={false} />)

    expect(screen.queryByText('EN PROGRESO')).not.toBeInTheDocument()
  })

  it('renders meta parts correctly', () => {
    const metaParts: MetaPart[] = [
      { id: 'author', node: <span>John Doe</span> },
      { id: 'time', node: <span>2 hours ago</span> },
    ]

    render(<SekiPipelineCard {...defaultProps} metaParts={metaParts} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <SekiPipelineCard {...defaultProps}>
        <button>View Details</button>
      </SekiPipelineCard>
    )

    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <SekiPipelineCard {...defaultProps} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})
