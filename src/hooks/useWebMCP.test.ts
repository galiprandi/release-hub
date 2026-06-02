import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWebMCP } from './useWebMCP'
import { runCommand } from '@/api/exec'
import axios from 'axios'

// Mock runCommand and axios
vi.mock('@/api/exec', () => ({
  runCommand: vi.fn(),
}))
vi.mock('axios')

describe('useWebMCP', () => {
  let mockRegisterTool: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRegisterTool = vi.fn()

    // Mock document.modelContext
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool: mockRegisterTool,
      },
      writable: true,
      configurable: true,
    })
  })

  it('registers all tools on mount', () => {
    renderHook(() => useWebMCP())

    expect(mockRegisterTool).toHaveBeenCalledTimes(3)

    const registeredTools = mockRegisterTool.mock.calls.map((call: any[]) => call[0].name)
    expect(registeredTools).toContain('search_repositories')
    expect(registeredTools).toContain('get_repo_details')
    expect(registeredTools).toContain('promote_to_production')
  })

  it('search_repositories tool calls runCommand correctly', async () => {
    renderHook(() => useWebMCP())
    const searchTool = mockRegisterTool.mock.calls.find((call: any[]) => call[0].name === 'search_repositories')[0]

    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'user_login', stderr: '', success: true }) // for /user
    vi.mocked(runCommand).mockResolvedValueOnce({
      stdout: JSON.stringify({ data: { search: { nodes: [{ nameWithOwner: 'org/repo' }] } } }),
      stderr: '',
      success: true
    }) // for graphql search

    const result = await searchTool.execute({ query: 'my-repo' })

    expect(runCommand).toHaveBeenCalledWith(['gh', 'api', '/user', '--jq', '.login'])
    expect(runCommand).toHaveBeenCalledWith(expect.arrayContaining(['gh', 'api', 'graphql']))
    expect(result).toEqual([{ nameWithOwner: 'org/repo' }])
  })

  it('get_repo_details tool calls runCommand correctly', async () => {
    renderHook(() => useWebMCP())
    const detailsTool = mockRegisterTool.mock.calls.find((call: any[]) => call[0].name === 'get_repo_details')[0]

    vi.mocked(runCommand).mockResolvedValueOnce({
      stdout: JSON.stringify([{ hash: 'sha1', author: 'me', message: 'feat', date: 'now' }]),
      stderr: '',
      success: true
    }) // for commits
    vi.mocked(runCommand).mockResolvedValueOnce({
      stdout: JSON.stringify({ name: 'v1.0.0', commit: 'sha1' }),
      stderr: '',
      success: true
    }) // for tags

    const result = await detailsTool.execute({ repo: 'org/repo' })

    expect(runCommand).toHaveBeenCalledWith(expect.arrayContaining(['gh', 'api', 'repos/org/repo/commits']))
    expect(runCommand).toHaveBeenCalledWith(expect.arrayContaining(['gh', 'api', 'repos/org/repo/tags']))
    expect(result.repo).toBe('org/repo')
    expect(result.latestCommits).toHaveLength(1)
    expect(result.latestTag.name).toBe('v1.0.0')
  })

  it('promote_to_production tool calls APIs correctly', async () => {
    renderHook(() => useWebMCP())
    const promoteTool = mockRegisterTool.mock.calls.find((call: any[]) => call[0].name === 'promote_to_production')[0]

    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'my-token', stderr: '', success: true }) // for token
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'target-sha', stderr: '', success: true }) // for main commit

    vi.mocked(axios.post).mockResolvedValueOnce({ data: { sha: 'tag-obj-sha' } }) // for create tag
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} }) // for create ref

    const result = await promoteTool.execute({ repo: 'org/repo', tagName: 'v1.1.0', tagMessage: 'New release' })

    expect(runCommand).toHaveBeenCalledWith(['gh', 'auth', 'token'])
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/git/tags',
      expect.objectContaining({ tag: 'v1.1.0' }),
      expect.anything()
    )
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/git/refs',
      expect.objectContaining({ ref: 'refs/tags/v1.1.0', sha: 'tag-obj-sha' }),
      expect.anything()
    )
    expect(result.success).toBe(true)
  })
})
