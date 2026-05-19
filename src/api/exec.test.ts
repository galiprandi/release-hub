import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runCommand, runCommandWithAI, apiExec } from './exec'

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

  describe('runCommandWithAI', () => {
    it('should execute command successfully', async () => {
      const mockResponse = {
        data: {
          stdout: 'success',
          stderr: '',
          success: true
        }
      }
      vi.spyOn(apiExec, 'post').mockResolvedValue(mockResponse)

      const result = await runCommandWithAI('echo hello')
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw original error when command fails and no AI processor provided', async () => {
      vi.spyOn(apiExec, 'post').mockRejectedValue(new Error('Original error'))

      await expect(runCommandWithAI('echo hello')).rejects.toThrow('Original error')
    })

    it('should use AI processor to format error when command fails', async () => {
      vi.spyOn(apiExec, 'post').mockRejectedValue(new Error('Original technical error'))
      const mockAIProcessor = vi.fn().mockResolvedValue('Friendly AI error')

      await expect(runCommandWithAI('echo hello', mockAIProcessor)).rejects.toThrow('Friendly AI error')
      expect(mockAIProcessor).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle non-Error objects in AI processor', async () => {
      vi.spyOn(apiExec, 'post').mockRejectedValue('String error')
      const mockAIProcessor = vi.fn().mockResolvedValue('Friendly AI error from string')

      await expect(runCommandWithAI('echo hello', mockAIProcessor)).rejects.toThrow('Friendly AI error from string')
      expect(mockAIProcessor).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
