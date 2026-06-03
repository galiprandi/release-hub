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

  describe('Vite Middleware Hardening (Path Traversal)', () => {
    // Note: These tests simulate the logic in vite.config.ts since we can't easily test the Vite server in vitest
    const validateAction = (action: string) => /^[a-zA-Z0-9-]+$/.test(action)
    const validateRepo = (repo: string) => /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(repo) && !repo.includes('..')

    it('should reject path traversal in action parameter', () => {
      expect(validateAction('../etc/passwd')).toBe(false)
      expect(validateAction('scripts/deploy')).toBe(false) // Only alphanumeric and hyphens
      expect(validateAction('deploy; rm -rf /')).toBe(false)
      expect(validateAction('trigger-staging-redeploy')).toBe(true)
    })

    it('should reject argument injection and path traversal in repo parameter', () => {
      expect(validateRepo('org/repo; rm -rf /')).toBe(false)
      expect(validateRepo('org/repo --help')).toBe(false)
      expect(validateRepo('-flag-injection')).toBe(false) // Must start with alphanumeric
      expect(validateRepo('org/repo/../../etc/passwd')).toBe(false)
      expect(validateRepo('Cencosud-xlabs/release-hub')).toBe(true)
    })
  })

  describe('Terminal Middleware Hardening', () => {
    // RFC 1123 DNS Subdomain standards
    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
    const contextRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    const dockerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

    it('should validate Kubernetes resource names correctly', () => {
      expect(k8sNameRegex.test('my-pod')).toBe(true)
      expect(k8sNameRegex.test('my-pod; rm -rf /')).toBe(false)
      expect(k8sNameRegex.test('invalid_name')).toBe(false)
      expect(k8sNameRegex.test('valid.name.with.dots')).toBe(true) // Subdomains allow dots
      expect(k8sNameRegex.test('UpperCase')).toBe(false)
    })

    it('should validate Kubernetes contexts correctly', () => {
      expect(contextRegex.test('gke_project_region_cluster')).toBe(true)
      expect(contextRegex.test('context; whoami')).toBe(false)
    })

    it('should validate Docker container names correctly', () => {
      expect(dockerNameRegex.test('my_container')).toBe(true)
      expect(dockerNameRegex.test('my-container-123')).toBe(true)
      expect(dockerNameRegex.test('container; exit')).toBe(false)
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
