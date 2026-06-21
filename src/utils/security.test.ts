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
        on: vi.fn((event, handler) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 10);
          }
        }),
        kill: vi.fn(),
      };

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
  });
});
