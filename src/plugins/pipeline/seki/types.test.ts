import { describe, it, expect } from 'vitest'
import type { SekiPipelineData, SekiPipelineEvent, SekiPipelineState } from './types'

describe('Seki Types', () => {
  describe('SekiPipelineState', () => {
    it('should accept valid state values', () => {
      const states: SekiPipelineState[] = ['IDLE', 'STARTED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SUCCESS', 'WARN']
      expect(states).toHaveLength(8)
    })
  })

  describe('SekiPipelineEvent', () => {
    it('should create a valid pipeline event', () => {
      const event: SekiPipelineEvent = {
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

  describe('SekiPipelineData', () => {
    it('should create valid pipeline data structure', () => {
      const data: SekiPipelineData = {
        id: 'pipeline-1',
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
          },
        ],
        updatedAt: '2024-01-01T00:05:00Z',
      }

      expect(data.id).toBe('pipeline-1')
      expect(data.ref).toBe('abc1234')
      expect(data.refType).toBe('COMMIT')
      expect(data.events).toHaveLength(1)
    })

    it('should support TAG refType', () => {
      const data: SekiPipelineData = {
        id: 'pipeline-2',
        ref: 'v1.0.0',
        refType: 'TAG',
        state: 'COMPLETED',
        events: [],
        updatedAt: '2024-01-01T00:05:00Z',
      }

      expect(data.refType).toBe('TAG')
      expect(data.ref).toBe('v1.0.0')
    })
  })
})
