import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runCommand, apiExec } from './exec'

describe('api/exec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('runCommand', () => {
    it('should execute command successfully', async () => {
      const mockResponse = {
        data: {
          stdout: 'hello world',
          stderr: '',
          success: true
        }
      }
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue(mockResponse)

      const result = await runCommand('echo hello world')

      expect(result).toEqual(mockResponse.data)
      expect(spy).toHaveBeenCalledWith('/exec', { command: 'echo hello world' }, expect.any(Object))
    })

    it('should throw error when success is false', async () => {
      const mockResponse = {
        data: {
          stdout: '',
          stderr: 'error message',
          success: false,
          error: 'Command failed specifically'
        }
      }
      vi.spyOn(apiExec, 'post').mockResolvedValue(mockResponse)

      await expect(runCommand('invalid-cmd')).rejects.toThrow('Command failed specifically')
    })

    it('should use default error message when success is false and no error provided', async () => {
      const mockResponse = {
        data: {
          stdout: '',
          stderr: 'error message',
          success: false
        }
      }
      vi.spyOn(apiExec, 'post').mockResolvedValue(mockResponse)

      await expect(runCommand('invalid-cmd')).rejects.toThrow('Command failed')
    })

    it('should throw error when network call fails', async () => {
      vi.spyOn(apiExec, 'post').mockRejectedValue(new Error('Network error'))

      await expect(runCommand('echo hello')).rejects.toThrow('Network error')
    })
  })
})
