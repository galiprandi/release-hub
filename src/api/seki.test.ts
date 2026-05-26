import { describe, it, expect, vi } from 'vitest'
import { fetchPipeline, apiSeki } from './seki'

vi.mock('@/utils/sekiToken', () => ({ getSekiToken: vi.fn() }))

describe('api/seki', () => {
  it('fetchPipeline retorna el pipeline', async () => {
    const mockP = { id: '1' }
    const spy = vi.spyOn(apiSeki, 'get').mockResolvedValue({ data: mockP })

    const res = await fetchPipeline('o/r', 'commit')
    expect(res).toBe(mockP)
    expect(spy).toHaveBeenCalledWith('/products/o/r/pipelines/commit')
  })
})
