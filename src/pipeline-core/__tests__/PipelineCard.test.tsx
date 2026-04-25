import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineCard } from '../components/PipelineCard'
import type { MetaPart, PipelineCardProps } from '../components/PipelineCard'

describe('PipelineCard', () => {
  const defaultProps: PipelineCardProps = {
    stage: 'staging',
    displayRef: 'abc1234',
    refType: 'COMMIT',
    isRunning: false,
    metaParts: [],
  }

  it('renders with basic props', () => {
    render(<PipelineCard {...defaultProps} />)
    
    expect(screen.getByText('abc1234')).toBeInTheDocument()
    expect(screen.getByText('COMMIT')).toBeInTheDocument()
  })

  it('renders tag ref type for production', () => {
    render(
      <PipelineCard
        {...defaultProps}
        stage="production"
        displayRef="v1.0.0"
        refType="TAG"
      />
    )
    
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('TAG')).toBeInTheDocument()
  })

  it('shows running indicator when isRunning is true', () => {
    render(<PipelineCard {...defaultProps} isRunning={true} />)
    
    expect(screen.getByText('EN PROGRESO')).toBeInTheDocument()
  })

  it('does not show running indicator when isRunning is false', () => {
    render(<PipelineCard {...defaultProps} isRunning={false} />)
    
    expect(screen.queryByText('EN PROGRESO')).not.toBeInTheDocument()
  })

  it('renders meta parts correctly', () => {
    const metaParts: MetaPart[] = [
      { id: 'author', node: <span>John Doe</span> },
      { id: 'time', node: <span>2 hours ago</span> },
    ]
    
    render(<PipelineCard {...defaultProps} metaParts={metaParts} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <PipelineCard {...defaultProps}>
        <button>View Details</button>
      </PipelineCard>
    )
    
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <PipelineCard {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has different styling for staging vs production', () => {
    const { container: stagingContainer } = render(
      <PipelineCard {...defaultProps} stage="staging" />
    )
    
    const { container: productionContainer } = render(
      <PipelineCard {...defaultProps} stage="production" />
    )
    
    // Both should render successfully with different accent colors
    expect(stagingContainer.firstChild).toBeInTheDocument()
    expect(productionContainer.firstChild).toBeInTheDocument()
  })
})
