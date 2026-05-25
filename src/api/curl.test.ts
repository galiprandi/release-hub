import { describe, it, expect, vi } from 'vitest';
import { checkCurlInstalled, executeCurlCommand } from './curl';
import { runCommand } from '@/api/exec';

vi.mock('@/api/exec', () => ({
  runCommand: vi.fn(),
}));

describe('curl api', () => {
  it('checkCurlInstalled returns true when curl is found', async () => {
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'curl 8.5.0', stderr: '', success: true });
    expect(await checkCurlInstalled()).toBe(true);
  });

  it('executeCurlCommand executes curl with -i flag', async () => {
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'HTTP/1.1 200 OK\n\n{}', stderr: '', success: true });
    const res = await executeCurlCommand(['https://api.example.com']);
    expect(res).toContain('HTTP/1.1 200 OK');
    expect(runCommand).toHaveBeenCalledWith('curl -i https://api.example.com');
  });
});
