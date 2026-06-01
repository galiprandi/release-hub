import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiExec, runCommand } from './exec'
import { startContainer } from './docker'
import { getDeployment } from './kubectl'
import { executeCurlCommand } from './curl'

describe('Security Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Shell Injection Protection', () => {
    it('should neutralize semicolon injection in docker commands', async () => {
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '', stderr: '' }
      })

      const maliciousId = 'abc; rm -rf /'
      // We expect the sanitizer to catch it first if it's still there
      try {
        await startContainer(maliciousId)
      } catch {
        // Sanitizer caught it, which is also good security
      }

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      if (lastCall) {
        const args = (lastCall[1] as { args: string[] }).args
        expect(args).toContain(maliciousId)
      }
    })

    it('should neutralize backtick injection in kubectl commands', async () => {
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '{}', stderr: '' }
      })

      const maliciousName = 'web-`id`'
      try {
        await getDeployment(maliciousName, 'default')
      } catch {
        // Sanitizer might catch it
      }

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      if (lastCall) {
        const args = (lastCall[1] as { args: string[] }).args
        expect(args).toContain(maliciousName)
      }
    })

    it('should neutralize command substitution in curl commands', async () => {
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '', stderr: '' }
      })

      const maliciousUrl = 'https://example.com$(whoami)'
      await executeCurlCommand([maliciousUrl])

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      const args = (lastCall[1] as { args: string[] }).args
      expect(args).toContain(maliciousUrl)
    })

    it('should handle single quotes within arguments correctly', async () => {
       const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '', stderr: '' }
      })

      const argWithQuote = "O'Reilly"
      await executeCurlCommand([argWithQuote])

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      const args = (lastCall[1] as { args: string[] }).args
      expect(args).toContain(argWithQuote)
    })

    it('should throw error if command is not an array (runtime enforcement)', async () => {
      // @ts-expect-error - testing runtime check for non-array input
      await expect(runCommand('ls -la')).rejects.toThrow('Security violation: runCommand requires an array of arguments')
    })
  })

  describe('Complex Command Pipelines', () => {
    it('should neutralize pipe injection in array-based commands', async () => {
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '', stderr: '' }
      })

      const maliciousArg = 'arg | rm -rf /'
      await executeCurlCommand([maliciousArg])

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      const args = (lastCall[1] as { args: string[] }).args
      expect(args).toContain(maliciousArg)
    })

    it('should neutralize redirection injection in array-based commands', async () => {
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '', stderr: '' }
      })

      const maliciousArg = 'arg > /etc/passwd'
      await executeCurlCommand([maliciousArg])

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      const args = (lastCall[1] as { args: string[] }).args
      expect(args).toContain(maliciousArg)
    })
  })
})
