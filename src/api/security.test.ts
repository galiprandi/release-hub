import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runCommand, apiExec } from './exec'
import { startContainer, stopContainer, getContainerLogs } from './docker'
import { getDeployment, getResourceLogs } from './kubectl'
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
      } catch (e) {
        // Sanitizer caught it, which is also good security
      }

      // If it passed the sanitizer, it should be quoted by joinArgs/quote
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      if (lastCall) {
        const command = lastCall[1].command
        expect(command).toContain("'abc; rm -rf /'")
        expect(command).not.toMatch(/docker start abc; rm -rf \//)
      }
    })

    it('should neutralize backtick injection in kubectl commands', async () => {
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '{}', stderr: '' }
      })

      const maliciousName = 'web-`id`'
      try {
        await getDeployment(maliciousName, 'default')
      } catch (e) {
        // Sanitizer might catch it
      }

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      if (lastCall) {
        const command = lastCall[1].command
        expect(command).toContain("'web-`id`'")
      }
    })

    it('should neutralize command substitution in curl commands', async () => {
      const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '', stderr: '' }
      })

      const maliciousUrl = 'https://example.com$(whoami)'
      await executeCurlCommand([maliciousUrl])

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      const command = lastCall[1].command
      expect(command).toContain("'https://example.com$(whoami)'")
      // The whole command string will contain it, but it should be inside single quotes
      // and NOT appear as a bare word
      expect(command).not.toMatch(/[^\']https:\/\/example\.com\$\(whoami\)/)
    })

    it('should handle single quotes within arguments correctly', async () => {
       const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
        data: { success: true, stdout: '', stderr: '' }
      })

      const argWithQuote = "O'Reilly"
      await executeCurlCommand([argWithQuote])

      const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
      const command = lastCall[1].command
      // POSIX quote for O'Reilly is 'O'\''Reilly'
      expect(command).toContain("'O'\\''Reilly'")
    })
  })
})
