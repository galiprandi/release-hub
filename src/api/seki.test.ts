import { describe, it, expect, vi } from 'vitest'
import { fetchPipelinesByEnvironment, apiSeki } from './seki'

vi.mock('@/utils/sekiToken', () => ({ getSekiToken: vi.fn() }))

describe('api/seki', () => {
  it('fetchPipelinesByEnvironment retorna pipelines por ambiente', async () => {
    const mockP = { staging: null, production: null }
    const spy = vi.spyOn(apiSeki, 'get').mockResolvedValue({ data: mockP })

    const res = await fetchPipelinesByEnvironment('o/r')
    expect(res.data).toBe(mockP)
    expect(spy).toHaveBeenCalledWith('/products/o/r/pipelines/latest-by-environment')
  })
})
