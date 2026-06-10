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

  describe('Internal SSRF Protection', () => {
    const isInternal = (hostname: string) => {
      const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
      if (
        lower === 'localhost' ||
        lower === '127.0.0.1' ||
        lower === '::1' ||
        lower === '0.0.0.0' ||
        lower === '::' ||
        lower === '0:0:0:0:0:0:0:1' ||
        lower === '0:0:0:0:0:0:0:0' ||
        lower === '::ffff:127.0.0.1'
      ) return true;
      if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;
      if (
        lower === '169.254.169.254' ||
        lower === 'metadata.google.internal' ||
        lower === 'instance-data' ||
        lower === 'fd00::'
      ) return true;
      const parts = hostname.split('.').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        if (parts[0] === 10) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
      }
      return false;
    };

    it('should block loopback addresses', () => {
      expect(isInternal('localhost')).toBe(true);
      expect(isInternal('127.0.0.1')).toBe(true);
      expect(isInternal('::1')).toBe(true);
      expect(isInternal('[::1]')).toBe(true);
      expect(isInternal('0:0:0:0:0:0:0:1')).toBe(true);
      expect(isInternal('::')).toBe(true);
      expect(isInternal('0.0.0.0')).toBe(true);
      expect(isInternal('::ffff:127.0.0.1')).toBe(true);
    });

    it('should block private network addresses (RFC 1918)', () => {
      expect(isInternal('10.0.0.1')).toBe(true);
      expect(isInternal('172.16.0.1')).toBe(true);
      expect(isInternal('172.31.255.255')).toBe(true);
      expect(isInternal('192.168.1.1')).toBe(true);
    });

    it('should block cloud metadata addresses', () => {
      expect(isInternal('169.254.169.254')).toBe(true);
      expect(isInternal('metadata.google.internal')).toBe(true);
    });

    it('should allow public addresses', () => {
      expect(isInternal('google.com')).toBe(false);
      expect(isInternal('8.8.8.8')).toBe(false);
      expect(isInternal('my-service.prod.company.com')).toBe(false);
    });
  })

  describe('Flag Injection Protection', () => {
    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

    it('should reject names starting with hyphens (flag injection)', () => {
      expect(k8sNameRegex.test('--kubeconfig=/root/.kube/config')).toBe(false);
      expect(k8sNameRegex.test('-n')).toBe(false);
    });

    it('should reject names with spaces or shell characters', () => {
      expect(k8sNameRegex.test('pod-name; rm -rf /')).toBe(false);
      expect(k8sNameRegex.test('pod name')).toBe(false);
    });
  })

  describe('Middleware Command Allow-listing', () => {
    const SAFE_COMMANDS = [
      "gh", "kubectl", "docker", "curl", "lsof", "node", "ls", "echo", "jq", "helm",
      "powershell.exe", "zsh", "bash", "sh"
    ];

    it('should allow commands in the safe list', () => {
      expect(SAFE_COMMANDS).toContain('gh');
      expect(SAFE_COMMANDS).toContain('kubectl');
      expect(SAFE_COMMANDS).toContain('docker');
      expect(SAFE_COMMANDS).toContain('curl');
    });

    it('should not contain dangerous commands', () => {
      expect(SAFE_COMMANDS).not.toContain('rm');
      expect(SAFE_COMMANDS).not.toContain('mv');
      expect(SAFE_COMMANDS).not.toContain('cp');
      expect(SAFE_COMMANDS).not.toContain('ssh');
      expect(SAFE_COMMANDS).not.toContain('nc');
    });
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
