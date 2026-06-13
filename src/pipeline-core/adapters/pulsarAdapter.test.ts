import { describe, it, expect, vi } from 'vitest'
import { pulsarAdapter } from './pulsarAdapter'
import * as execApi from '@/api/exec'

vi.mock('@/api/exec', () => ({ runCommand: vi.fn() }))

interface ExecResponse {
  stdout: string
  stderr: string
  success: boolean
  error?: string
}

describe('pulsarAdapter', () => {
  it('should fetch and transform pulsar data correctly', async () => {
    const mockRun = { id: 1, head_sha: 'abcdef123', status: 'completed', conclusion: 'success', created_at: '2025-01-01', updated_at: '2025-01-01', html_url: 'http' }
    const mockJob = { id: 101, name: 'Build', status: 'completed', conclusion: 'success', started_at: '2025-01-01', completed_at: '2025-01-01' }
    const mockCommit = { message: 'feat: test', author: 'Vigia' }

    vi.mocked(execApi.runCommand)
      .mockResolvedValueOnce({ stdout: '123', success: true, stderr: '' } as ExecResponse) // Workflow ID
      .mockResolvedValueOnce({ stdout: JSON.stringify(mockRun), success: true, stderr: '' } as ExecResponse) // Runs
      .mockResolvedValueOnce({ stdout: JSON.stringify(mockJob), success: true, stderr: '' } as ExecResponse) // Jobs
      .mockResolvedValueOnce({ stdout: JSON.stringify(mockCommit), success: true, stderr: '' } as ExecResponse) // Commit

    const result = await pulsarAdapter.fetch('o', 'r', 'commits', 'main')
    expect(result?.id).toBe('gha-1')
    expect(result?.state).toBe('COMPLETED')
    expect(result?.events[0].name).toBe('Build')
    expect(result?.commit?.author).toBe('Vigia')
  })

  it('should return null when no workflow runs are found', async () => {
    vi.mocked(execApi.runCommand)
      .mockResolvedValueOnce({ stdout: '123', success: true, stderr: '' } as ExecResponse) // Workflow ID
      .mockResolvedValueOnce({ stdout: '', success: true, stderr: '' } as ExecResponse) // No runs

    const result = await pulsarAdapter.fetch('o', 'r', 'commits', 'main')
    expect(result).toBeNull()
  })

  it('should support repos with Nx Build workflow', async () => {
    vi.mocked(execApi.runCommand).mockResolvedValueOnce({ stdout: 'Nx Build\nOther', success: true, stderr: '' } as ExecResponse)
    expect(await pulsarAdapter.supports('o', 'r')).toBe(true)
  })
})
