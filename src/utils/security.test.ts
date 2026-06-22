import { describe, it, expect, vi } from 'vitest';
import { isInternalAddress } from './security';
import { spawnAsync } from './node/spawn';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

describe('security utils', () => {
  describe('spawnAsync', () => {
    it('should succeed when process closes before timeout', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockProcess: any = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, handler: (code: number) => void) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 10);
          }
        }),
        kill: vi.fn(),
      } as unknown as childProcess.ChildProcess;

      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess);

      const result = await spawnAsync(['echo', 'hello']);
      expect(result.success).toBe(true);
      expect(mockProcess.kill).not.toHaveBeenCalled();
    });
  });

  describe('isInternalAddress', () => {
    it('should identify internal addresses', () => {
      expect(isInternalAddress('127.0.0.1')).toBe(true);
      expect(isInternalAddress('10.0.0.1')).toBe(true);
      expect(isInternalAddress('169.254.169.254')).toBe(true);
      expect(isInternalAddress('localhost')).toBe(true);
      expect(isInternalAddress('google.com')).toBe(false);
    });

    it('should identify IPv4 range variations', () => {
      expect(isInternalAddress('127.255.255.255')).toBe(true);
      expect(isInternalAddress('10.255.255.255')).toBe(true);
      expect(isInternalAddress('172.16.0.0')).toBe(true);
      expect(isInternalAddress('172.31.255.255')).toBe(true);
      expect(isInternalAddress('192.168.0.0')).toBe(true);
      expect(isInternalAddress('192.168.255.255')).toBe(true);
      expect(isInternalAddress('169.254.0.0')).toBe(true);
    });

    it('should identify CGNAT addresses', () => {
      expect(isInternalAddress('100.64.0.0')).toBe(true);
      expect(isInternalAddress('100.127.255.255')).toBe(true);
      expect(isInternalAddress('100.63.255.255')).toBe(false);
      expect(isInternalAddress('100.128.0.0')).toBe(false);
    });

    it('should handle IPv6 addresses', () => {
      expect(isInternalAddress('::1')).toBe(true);
      expect(isInternalAddress('[::1]')).toBe(true);
      expect(isInternalAddress('fe80::1')).toBe(true);
      expect(isInternalAddress('fc00::')).toBe(true);
      expect(isInternalAddress('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    });

    it('should handle IPv4-mapped IPv6 addresses', () => {
      expect(isInternalAddress('::ffff:127.0.0.1')).toBe(true);
      expect(isInternalAddress('::ffff:10.0.0.1')).toBe(true);
      expect(isInternalAddress('::ffff:8.8.8.8')).toBe(false);
    });

    it('should handle cloud metadata and local domains', () => {
      expect(isInternalAddress('metadata.google.internal')).toBe(true);
      expect(isInternalAddress('instance-data')).toBe(true);
      expect(isInternalAddress('service.local')).toBe(true);
      expect(isInternalAddress('api.internal')).toBe(true);
    });

    it('should handle decimal and hex IP bypasses', () => {
      // 2130706433 is 127.0.0.1
      expect(isInternalAddress('2130706433')).toBe(true);
      // 0x7f000001 is 127.0.0.1
      expect(isInternalAddress('0x7f000001')).toBe(true);
      // 16843009 is 1.1.1.1
      expect(isInternalAddress('16843009')).toBe(false);
      // 0x01010101 is 1.1.1.1
      expect(isInternalAddress('0x01010101')).toBe(false);

      // Private ranges in decimal
      // 10.0.0.1 = 167772161
      expect(isInternalAddress('167772161')).toBe(true);
      // 192.168.1.1 = 3232235777
      expect(isInternalAddress('3232235777')).toBe(true);
    });
  });
});
