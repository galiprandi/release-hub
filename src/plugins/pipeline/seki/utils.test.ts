import { describe, it, expect } from 'vitest'
import { extractRoutes, getPipelineStatusInfo } from './utils'
import type { SekiPipelineEvent } from './types'

describe('extractRoutes', () => {
  it('extracts URLs from DEPLOY events markdown', () => {
    const events: SekiPipelineEvent[] = [
      {
        id: 'DEPLOY_STAGING',
        name: 'Deploy Staging',
        state: 'COMPLETED',
        markdown: 'Deployed to https://example.com/api/service',
      },
    ]
    const routes = extractRoutes(events)
    expect(routes).toContain('https://example.com/api/service')
  })

  it('filters out internal Kubernetes URLs', () => {
    const events: SekiPipelineEvent[] = [
      {
        id: 'DEPLOY_PROD',
        name: 'Deploy Prod',
        state: 'COMPLETED',
        markdown: 'Internal: http://my-svc.svc.cluster.local:8080 External: https://example.com',
      },
    ]
    const routes = extractRoutes(events)
    expect(routes).toContain('https://example.com')
    expect(routes).not.toContain('http://my-svc.svc.cluster.local:8080')
  })

  it('returns empty array for non-DEPLOY events', () => {
    const events: SekiPipelineEvent[] = [
      {
        id: 'BUILD',
        name: 'Build',
        state: 'COMPLETED',
        markdown: 'https://example.com',
      },
    ]
    const routes = extractRoutes(events)
    expect(routes).toHaveLength(0)
  })

  it('deduplicates URLs', () => {
    const events: SekiPipelineEvent[] = [
      {
        id: 'DEPLOY_1',
        name: 'Deploy 1',
        state: 'COMPLETED',
        markdown: 'https://example.com/api',
      },
      {
        id: 'DEPLOY_2',
        name: 'Deploy 2',
        state: 'COMPLETED',
        markdown: 'https://example.com/api',
      },
    ]
    const routes = extractRoutes(events)
    expect(routes).toHaveLength(1)
  })
})

describe('getPipelineStatusInfo', () => {
  it('returns undefined status for empty events', () => {
    const info = getPipelineStatusInfo([], '2024-01-01')
    expect(info.status).toBeUndefined()
    expect(info.updatedAt).toBe('2024-01-01')
  })

  it('returns undefined status for undefined events', () => {
    const info = getPipelineStatusInfo(undefined)
    expect(info.status).toBeUndefined()
  })

  it('detects FAILED from deploy events', () => {
    const events: SekiPipelineEvent[] = [
      { id: 'DEPLOY_PROD', name: 'Deploy', state: 'FAILED', markdown: 'error' },
    ]
    const info = getPipelineStatusInfo(events)
    expect(info.status).toBe('FAILED')
    expect(info.failedStage).toBe('Deploy')
  })

  it('detects SUCCESS when all deploy events succeed', () => {
    const events: SekiPipelineEvent[] = [
      { id: 'DEPLOY_STAGING', name: 'Deploy Staging', state: 'COMPLETED' },
      { id: 'DEPLOY_PROD', name: 'Deploy Prod', state: 'SUCCESS' },
    ]
    const info = getPipelineStatusInfo(events)
    expect(info.status).toBe('SUCCESS')
  })

  it('falls back to last event state', () => {
    const events: SekiPipelineEvent[] = [
      { id: 'BUILD', name: 'Build', state: 'COMPLETED' },
      { id: 'TEST', name: 'Test', state: 'RUNNING' },
    ]
    const info = getPipelineStatusInfo(events)
    expect(info.status).toBe('RUNNING')
  })
})
