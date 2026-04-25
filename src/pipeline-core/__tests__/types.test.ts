import { describe, it, expect } from 'vitest'
import type { PipelineData, PipelineEvent, PipelineState, ViewMode, PipelineProvider } from '../types'

describe('Pipeline Core Types', () => {
  describe('PipelineState', () => {
    it('should accept valid state values', () => {
      const states: PipelineState[] = ['IDLE', 'STARTED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']
      expect(states).toHaveLength(6)
    })
  })

  describe('ViewMode', () => {
    it('should accept valid view mode values', () => {
      const mode1: ViewMode = 'commits'
      const mode2: ViewMode = 'tags'
      expect(mode1).toBe('commits')
      expect(mode2).toBe('tags')
    })
  })

  describe('PipelineProvider', () => {
    it('should accept valid provider values', () => {
      const provider1: PipelineProvider = 'seki'
      const provider2: PipelineProvider = 'pulsar'
      const provider3: PipelineProvider = null
      expect(provider1).toBe('seki')
      expect(provider2).toBe('pulsar')
      expect(provider3).toBeNull()
    })
  })

  describe('PipelineEvent', () => {
    it('should create a valid pipeline event', () => {
      const event: PipelineEvent = {
        id: 'event-1',
        name: 'Build',
        state: 'RUNNING',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: undefined,
        duration: undefined,
      }
      
      expect(event.id).toBe('event-1')
      expect(event.name).toBe('Build')
      expect(event.state).toBe('RUNNING')
    })
  })

  describe('PipelineData', () => {
    it('should create valid pipeline data structure', () => {
      const data: PipelineData = {
        id: 'pipeline-1',
        provider: 'seki',
        ref: 'abc1234',
        refType: 'COMMIT',
        state: 'COMPLETED',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:05:00Z',
        events: [
          {
            id: 'event-1',
            name: 'Build',
            state: 'COMPLETED',
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-01T00:03:00Z',
          }
        ],
        externalUrl: 'https://example.com/pipeline/1',
        commit: {
          message: 'Fix bug',
          author: 'John Doe',
        },
        updatedAt: '2024-01-01T00:05:00Z',
      }
      
      expect(data.id).toBe('pipeline-1')
      expect(data.provider).toBe('seki')
      expect(data.events).toHaveLength(1)
    })

    it('should support minimal pipeline data', () => {
      const data: PipelineData = {
        id: 'pipeline-2',
        provider: 'pulsar',
        ref: 'v1.0.0',
        refType: 'TAG',
        state: 'IDLE',
        events: [],
        updatedAt: '2024-01-01T00:00:00Z',
      }
      
      expect(data.commit).toBeUndefined()
      expect(data.externalUrl).toBeUndefined()
    })
  })
})
