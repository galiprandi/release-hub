import { describe, it, expect, vi } from 'vitest'
import { sekiAdapter } from './sekiAdapter'
import * as sekiApi from '@/api/seki'

vi.mock('@/api/seki', () => ({ fetchPipeline: vi.fn(), fetchPipelineWithTag: vi.fn() }))

describe('sekiAdapter', () => {
  it('should fetch and transform commit data', async () => {
    const mockData = { state: 'SUCCESS', created_at: '2025-01-01', git: { commit: 'abcdef123', commit_message: 'test', commit_author: 'Test', ref: 'v1' }, events: [] }
    vi.mocked(sekiApi.fetchPipeline).mockResolvedValue({ data: mockData } as unknown as Awaited<ReturnType<typeof sekiApi.fetchPipeline>>)
    const result = await sekiAdapter.fetch('o', 'r', 'commits', 'abcdef1')
    expect(result?.state).toBe('COMPLETED')
    expect(result?.ref).toBe('abcdef1')
  })

  it('should fetch and transform tag data', async () => {
    const mockData = { state: 'FAILED', created_at: '2025-01-01', git: { commit: 'abc', ref: 'v1.0.0', commit_message: 'msg', commit_author: 'auth' }, events: [] }
    vi.mocked(sekiApi.fetchPipelineWithTag).mockResolvedValue({ data: mockData } as unknown as Awaited<ReturnType<typeof sekiApi.fetchPipelineWithTag>>)
    const result = await sekiAdapter.fetch('o', 'r', 'tags', 'v1.0.0', 'abcdef1234567890abcdef1234567890abcdef12')
    expect(result?.state).toBe('FAILED')
    expect(result?.ref).toBe('v1.0.0')
    expect(result?.refType).toBe('TAG')
  })

  it('should return null for tag data without commit', async () => {
    expect(await sekiAdapter.fetch('o', 'r', 'tags', 'v1.0.0')).toBeNull()
    expect(await sekiAdapter.fetch('o', 'r', 'tags', 'v1.0.0', 'short')).toBeNull()
  })

  it('should transform events and subevents correctly', async () => {
    const mockData = { state: 'RUNNING', created_at: '2025-01-01', git: { commit: 'abc', commit_message: 'm', commit_author: 'a' }, events: [
      { id: 'ev1', label: { es: 'Inicio', en: 'Start', br: '' }, state: 'SUCCESS', subevents: [{ id: 'sub1', label: 'Step 1', state: 'SUCCESS' }] }
    ] }
    vi.mocked(sekiApi.fetchPipeline).mockResolvedValue({ data: mockData } as unknown as Awaited<ReturnType<typeof sekiApi.fetchPipeline>>)
    const result = await sekiAdapter.fetch('o', 'r', 'commits', 'abcdef1')
    expect(result?.events).toHaveLength(2)
    expect(result?.events[0].name).toBe('Inicio')
    expect(result?.events[1].name).toBe('Step 1')
  })

  it('should return null for short refs or API errors', async () => {
    expect(await sekiAdapter.fetch('o', 'r', 'commits', 'abc')).toBeNull()
    vi.mocked(sekiApi.fetchPipeline).mockRejectedValue(new Error())
    expect(await sekiAdapter.fetch('o', 'r', 'commits', 'abcdef1')).toBeNull()
  })
})
