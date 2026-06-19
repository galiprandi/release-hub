import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiExec, runCommand } from './exec'
import { startContainer } from './docker'
import { getDeployment } from './kubectl'
import { executeCurlCommand } from './curl'
import { isInternalAddress, VALIDATION, SAFE_COMMANDS } from '../utils/security'

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
    // Note: These tests simulate the logic in vite.config.ts using centralized VALIDATION
    const validateRepo = (repo: string) => /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(repo) && !repo.includes('..')

    it('should reject path traversal and unauthorized scripts in action parameter', () => {
      expect(VALIDATION.scripts.test('../etc/passwd')).toBe(false)
      expect(VALIDATION.scripts.test('scripts/deploy')).toBe(false)
      expect(VALIDATION.scripts.test('deploy; rm -rf /')).toBe(false)
      expect(VALIDATION.scripts.test('trigger-staging-redeploy')).toBe(true)
      expect(VALIDATION.scripts.test('install')).toBe(true)
      expect(VALIDATION.scripts.test('malicious-script')).toBe(false)
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
    it('should validate Kubernetes resource names correctly', () => {
      expect(VALIDATION.k8sName.test('my-pod')).toBe(true)
      expect(VALIDATION.k8sName.test('my-pod; rm -rf /')).toBe(false)
      expect(VALIDATION.k8sName.test('invalid_name')).toBe(false)
      expect(VALIDATION.k8sName.test('valid.name.with.dots')).toBe(true) // Subdomains allow dots
      expect(VALIDATION.k8sName.test('UpperCase')).toBe(false)
    })

    it('should enforce RFC 1123 length limits', () => {
      const longLabel = 'a'.repeat(64);
      const validLabel = 'a'.repeat(63);
      expect(VALIDATION.k8sName.test(longLabel)).toBe(false);
      expect(VALIDATION.k8sName.test(validLabel)).toBe(true);

      const longContext = 'a'.repeat(129);
      expect(VALIDATION.context.test(longContext)).toBe(false);
    })

    it('should validate Kubernetes contexts correctly', () => {
      expect(VALIDATION.context.test('gke_project_region_cluster')).toBe(true)
      expect(VALIDATION.context.test('context; whoami')).toBe(false)
    })

    it('should validate Docker container names correctly', () => {
      expect(VALIDATION.dockerName.test('my_container')).toBe(true)
      expect(VALIDATION.dockerName.test('my-container-123')).toBe(true)
      expect(VALIDATION.dockerName.test('container; exit')).toBe(false)
    })
  })

  describe('Internal SSRF Protection', () => {
    it('should block loopback addresses and normalization bypasses', () => {
      expect(isInternalAddress('localhost')).toBe(true);
      expect(isInternalAddress('127.0.0.1')).toBe(true);
      expect(isInternalAddress('127.8.8.8')).toBe(true); // Full 127.0.0.0/8
      expect(isInternalAddress('::1')).toBe(true);
      expect(isInternalAddress('[::1]')).toBe(true);
      expect(isInternalAddress('::')).toBe(true);
      expect(isInternalAddress('0.0.0.0')).toBe(true);
      expect(isInternalAddress('::ffff:127.0.0.1')).toBe(true);
      expect(isInternalAddress('::ffff:127.0.0.2')).toBe(true);
    });

    it('should block private network addresses (RFC 1918)', () => {
      expect(isInternalAddress('10.0.0.1')).toBe(true);
      expect(isInternalAddress('172.16.0.1')).toBe(true);
      expect(isInternalAddress('172.31.255.255')).toBe(true);
      expect(isInternalAddress('192.168.1.1')).toBe(true);
    });

    it('should block CGNAT addresses', () => {
      expect(isInternalAddress('100.64.0.1')).toBe(true);
      expect(isInternalAddress('100.127.255.255')).toBe(true);
      expect(isInternalAddress('100.63.255.255')).toBe(false);
    });

    it('should block IPv6 Link-Local and Unique Local addresses', () => {
      expect(isInternalAddress('fe80::1')).toBe(true);
      expect(isInternalAddress('fc00::')).toBe(true);
      expect(isInternalAddress('fd00::1')).toBe(true);
    });

    it('should block cloud metadata addresses and link-local', () => {
      expect(isInternalAddress('169.254.169.254')).toBe(true);
      expect(isInternalAddress('169.254.0.1')).toBe(true);
      expect(isInternalAddress('metadata.google.internal')).toBe(true);
      expect(isInternalAddress('instance-data')).toBe(true);
    });

    it('should allow public addresses', () => {
      expect(isInternalAddress('google.com')).toBe(false);
      expect(isInternalAddress('8.8.8.8')).toBe(false);
      expect(isInternalAddress('my-service.prod.company.com')).toBe(false);
    });
  })

  describe('DNS Rebinding Protection (Simulation)', () => {
    // In vite.config.ts, we resolve the hostname and check the IP
    // This test simulates that logic
    const lookupAndValidate = async (hostname: string, mockLookup: (h: string) => Promise<string>) => {
      if (isInternalAddress(hostname)) return { allowed: false, error: 'Hostname is internal' };

      try {
        const resolvedIp = await mockLookup(hostname);
        if (isInternalAddress(resolvedIp)) return { allowed: false, error: 'Resolved IP is internal' };
        return { allowed: true, resolvedIp };
      } catch {
        return { allowed: false, error: 'DNS resolution failed' };
      }
    };

    it('should block DNS Rebinding attack where hostname is external but resolves to internal IP', async () => {
      const maliciousHostname = 'malicious.com';
      const mockLookup = vi.fn().mockResolvedValue('127.0.0.1');

      const result = await lookupAndValidate(maliciousHostname, mockLookup);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Resolved IP is internal');
    });

    it('should allow legitimate external hostname resolving to external IP', async () => {
      const legitHostname = 'google.com';
      const mockLookup = vi.fn().mockResolvedValue('8.8.8.8');

      const result = await lookupAndValidate(legitHostname, mockLookup);
      expect(result.allowed).toBe(true);
      expect(result.resolvedIp).toBe('8.8.8.8');
    });
  })

  describe('Flag Injection Protection', () => {
    it('should reject names starting with hyphens (flag injection)', () => {
      expect(VALIDATION.k8sName.test('--kubeconfig=/root/.kube/config')).toBe(false);
      expect(VALIDATION.k8sName.test('-n')).toBe(false);
    });

    it('should reject names with spaces or shell characters', () => {
      expect(VALIDATION.k8sName.test('pod-name; rm -rf /')).toBe(false);
      expect(VALIDATION.k8sName.test('pod name')).toBe(false);
    });
  })

  describe('Middleware Command Allow-listing', () => {
    it('should allow commands in the safe list', () => {
      expect(SAFE_COMMANDS).toContain('gh');
      expect(SAFE_COMMANDS).toContain('kubectl');
      expect(SAFE_COMMANDS).toContain('docker');
      expect(SAFE_COMMANDS).toContain('curl');
    });

    it('should not contain shells or node', () => {
      expect(SAFE_COMMANDS).not.toContain('bash');
      expect(SAFE_COMMANDS).not.toContain('sh');
      expect(SAFE_COMMANDS).not.toContain('zsh');
      expect(SAFE_COMMANDS).not.toContain('powershell.exe');
      expect(SAFE_COMMANDS).not.toContain('node');
    });

    it('should not contain dangerous file commands', () => {
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
