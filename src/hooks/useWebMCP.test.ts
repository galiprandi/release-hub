import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWebMCP } from './useWebMCP'
import { runCommand } from '@/api/exec'
import { getRepoSearchScope } from '@/api/githubSearch'
import axios from 'axios'

// Mock runCommand and axios
vi.mock('@/api/exec', () => ({
  runCommand: vi.fn(),
}))
vi.mock('@/api/githubSearch', () => ({
  getRepoSearchScope: vi.fn().mockResolvedValue('user:user_login org:acme-org'),
}))
vi.mock('axios')

describe('useWebMCP', () => {
  let mockRegisterTool: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockRegisterTool = vi.fn()

    // Mock navigator.modelContext
    Object.defineProperty(navigator, 'modelContext', {
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

    const registeredTools = mockRegisterTool.mock.calls.map((call) => (call[0] as { name: string }).name)
    expect(registeredTools).toContain('search_repositories')
    expect(registeredTools).toContain('get_repo_details')
    expect(registeredTools).toContain('promote_to_production')
  })

  it('search_repositories tool calls runCommand correctly', async () => {
    renderHook(() => useWebMCP())
    const searchTool = mockRegisterTool.mock.calls.find((call) => (call[0] as { name: string }).name === 'search_repositories')?.[0] as { execute: (input: Record<string, unknown>) => Promise<unknown> }

    vi.mocked(runCommand).mockResolvedValueOnce({
      stdout: JSON.stringify({ data: { search: { nodes: [{ nameWithOwner: 'org/repo' }] } } }),
      stderr: '',
      success: true
    }) // for graphql search

    const result = await searchTool.execute({ query: 'my-repo' })

    expect(getRepoSearchScope).toHaveBeenCalled()
    expect(runCommand).toHaveBeenCalledWith(expect.arrayContaining(['gh', 'api', 'graphql']))
    const graphqlArgs = vi.mocked(runCommand).mock.calls[0][0]
    expect(graphqlArgs.join(' ')).toContain('my-repo user:user_login org:acme-org')
    expect(result).toEqual([{ nameWithOwner: 'org/repo' }])
  })

  it('get_repo_details tool calls runCommand correctly', async () => {
    renderHook(() => useWebMCP())
    const detailsTool = mockRegisterTool.mock.calls.find((call) => (call[0] as { name: string }).name === 'get_repo_details')?.[0] as { execute: (input: Record<string, unknown>) => Promise<unknown> }

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

    const result = await detailsTool.execute({ repo: 'org/repo' }) as { repo: string; latestCommits: unknown[]; latestTag: { name: string } }

    expect(runCommand).toHaveBeenCalledWith(['gh', 'api', 'repos/org/repo/commits?per_page=5', '--jq', '[.[] | {hash: .sha, author: .commit.author.name, message: .commit.message, date: .commit.author.date}]'])
    expect(runCommand).toHaveBeenCalledWith(['gh', 'api', 'repos/org/repo/tags?per_page=1', '--jq', '.[0] | {name: .name, commit: .commit.sha}'])
    expect(result.repo).toBe('org/repo')
    expect(result.latestCommits).toHaveLength(1)
    expect(result.latestTag.name).toBe('v1.0.0')
  })

  it('promote_to_production tool calls APIs correctly', async () => {
    renderHook(() => useWebMCP())
    const promoteTool = mockRegisterTool.mock.calls.find((call) => (call[0] as { name: string }).name === 'promote_to_production')?.[0] as { execute: (input: Record<string, unknown>) => Promise<unknown> }

    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'my-token', stderr: '', success: true }) // for token
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'target-sha', stderr: '', success: true }) // for main commit

    vi.mocked(axios.post).mockResolvedValueOnce({ data: { sha: 'tag-obj-sha' } }) // for create tag
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} }) // for create ref

    const result = await promoteTool.execute({ repo: 'org/repo', tagName: 'v1.1.0', tagMessage: 'New release' }) as { success: boolean }

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
