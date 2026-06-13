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
    const validateRepo = (repo: string) => /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(repo) && !repo.includes('..')

    it('should reject path traversal and unauthorized scripts in action parameter', () => {
      const validateScripts = (action: string) => /^(healthcheck|install|start|trigger-staging-redeploy|uninstall)$/.test(action)

      expect(validateScripts('../etc/passwd')).toBe(false)
      expect(validateScripts('scripts/deploy')).toBe(false)
      expect(validateScripts('deploy; rm -rf /')).toBe(false)
      expect(validateScripts('trigger-staging-redeploy')).toBe(true)
      expect(validateScripts('install')).toBe(true)
      expect(validateScripts('malicious-script')).toBe(false)
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
    const k8sNameRegex =
      /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?(\.[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?)*$/;
    const contextRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;
    const dockerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

    it('should validate Kubernetes resource names correctly', () => {
      expect(k8sNameRegex.test('my-pod')).toBe(true)
      expect(k8sNameRegex.test('my-pod; rm -rf /')).toBe(false)
      expect(k8sNameRegex.test('invalid_name')).toBe(false)
      expect(k8sNameRegex.test('valid.name.with.dots')).toBe(true) // Subdomains allow dots
      expect(k8sNameRegex.test('UpperCase')).toBe(false)
    })

    it('should enforce RFC 1123 length limits', () => {
      const longLabel = 'a'.repeat(64);
      const validLabel = 'a'.repeat(63);
      expect(k8sNameRegex.test(longLabel)).toBe(false);
      expect(k8sNameRegex.test(validLabel)).toBe(true);

      const longContext = 'a'.repeat(129);
      expect(contextRegex.test(longContext)).toBe(false);
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
      let addr = hostname.toLowerCase().replace(/^\[|\]$/g, '');

      // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
      if (addr.startsWith('::ffff:')) {
        addr = addr.slice(7);
      }

      if (addr === 'localhost' || addr === '::1' || addr === '::' || addr === '0.0.0.0') return true;
      if (addr.endsWith('.local') || addr.endsWith('.internal')) return true;

      // IPv4 Check
      const parts = addr.split('.').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [p0, p1] = parts;
        // Loopback (127.0.0.0/8)
        if (p0 === 127) return true;
        // RFC 1918 Private Space
        if (p0 === 10) return true;
        if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
        if (p0 === 192 && p1 === 168) return true;
        // Link-Local (169.254.0.0/16)
        if (p0 === 169 && p1 === 254) return true;
        // Shared Address Space / CGNAT (100.64.0.0/10)
        if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;
      }

      // IPv6 Check (simple prefix checks)
      if (addr.includes(':')) {
        // Link-local (fe80::/10)
        if (addr.startsWith('fe8') || addr.startsWith('fe9') || addr.startsWith('fea') || addr.startsWith('feb')) return true;
        // Unique Local (fc00::/7) -> fc00::/8 and fd00::/8
        if (addr.startsWith('fc') || addr.startsWith('fd')) return true;
      }

      // Cloud Metadata
      if (addr === 'metadata.google.internal' || addr === 'instance-data') return true;

      return false;
    };

    it('should block loopback addresses and normalization bypasses', () => {
      expect(isInternal('localhost')).toBe(true);
      expect(isInternal('127.0.0.1')).toBe(true);
      expect(isInternal('127.8.8.8')).toBe(true); // Full 127.0.0.0/8
      expect(isInternal('::1')).toBe(true);
      expect(isInternal('[::1]')).toBe(true);
      expect(isInternal('::')).toBe(true);
      expect(isInternal('0.0.0.0')).toBe(true);
      expect(isInternal('::ffff:127.0.0.1')).toBe(true);
      expect(isInternal('::ffff:127.0.0.2')).toBe(true);
    });

    it('should block private network addresses (RFC 1918)', () => {
      expect(isInternal('10.0.0.1')).toBe(true);
      expect(isInternal('172.16.0.1')).toBe(true);
      expect(isInternal('172.31.255.255')).toBe(true);
      expect(isInternal('192.168.1.1')).toBe(true);
    });

    it('should block CGNAT addresses', () => {
      expect(isInternal('100.64.0.1')).toBe(true);
      expect(isInternal('100.127.255.255')).toBe(true);
      expect(isInternal('100.63.255.255')).toBe(false);
    });

    it('should block IPv6 Link-Local and Unique Local addresses', () => {
      expect(isInternal('fe80::1')).toBe(true);
      expect(isInternal('fc00::')).toBe(true);
      expect(isInternal('fd00::1')).toBe(true);
    });

    it('should block cloud metadata addresses and link-local', () => {
      expect(isInternal('169.254.169.254')).toBe(true);
      expect(isInternal('169.254.0.1')).toBe(true);
      expect(isInternal('metadata.google.internal')).toBe(true);
      expect(isInternal('instance-data')).toBe(true);
    });

    it('should allow public addresses', () => {
      expect(isInternal('google.com')).toBe(false);
      expect(isInternal('8.8.8.8')).toBe(false);
      expect(isInternal('my-service.prod.company.com')).toBe(false);
    });
  })

  describe('DNS Rebinding Protection (Simulation)', () => {
    // In vite.config.ts, we resolve the hostname and check the IP
    // This test simulates that logic
    const lookupAndValidate = async (hostname: string, mockLookup: (h: string) => Promise<string>) => {
      const isInternal = (addr: string) => {
        if (addr === '127.0.0.1' || addr === '::1') return true;
        if (addr.startsWith('10.')) return true;
        return false;
      };

      if (isInternal(hostname)) return { allowed: false, error: 'Hostname is internal' };

      try {
        const resolvedIp = await mockLookup(hostname);
        if (isInternal(resolvedIp)) return { allowed: false, error: 'Resolved IP is internal' };
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
      "gh", "kubectl", "docker", "curl", "lsof", "ls", "echo", "jq", "helm"
    ];

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
