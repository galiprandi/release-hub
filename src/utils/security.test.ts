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

    it('should identify internal addresses in non-standard formats', () => {
      // Decimal format
      expect(isInternalAddress('2130706433')).toBe(true); // 127.0.0.1
      expect(isInternalAddress('2851996670')).toBe(true); // 169.254.169.254
      // Hex format
      expect(isInternalAddress('0x7f000001')).toBe(true); // 127.0.0.1
      expect(isInternalAddress('0xa9feafff')).toBe(true); // 169.254.175.255
      // Octal format
      expect(isInternalAddress('017700000001')).toBe(true); // 127.0.0.1
    });

    it('should identify abbreviated internal addresses', () => {
      expect(isInternalAddress('127.1')).toBe(true); // 127.0.0.1
      expect(isInternalAddress('10.1.2')).toBe(true); // 10.0.1.2
      expect(isInternalAddress('0')).toBe(true); // 0.0.0.0
    });

    it('should identify IPv4-mapped IPv6 internal addresses', () => {
      expect(isInternalAddress('::ffff:127.0.0.1')).toBe(true);
      expect(isInternalAddress('::ffff:10.0.0.1')).toBe(true);
    });

    it('should identify internal IPv6 ranges', () => {
      expect(isInternalAddress('::1')).toBe(true);
      expect(isInternalAddress('fe80::1')).toBe(true);
      expect(isInternalAddress('fc00::1')).toBe(true);
      expect(isInternalAddress('fd00::1')).toBe(true);
    });

    it('should allow legitimate external addresses', () => {
      expect(isInternalAddress('8.8.8.8')).toBe(false);
      expect(isInternalAddress('1.1.1.1')).toBe(false);
      expect(isInternalAddress('github.com')).toBe(false);
    });
  });
});
