import { describe, it, expect, vi } from 'vitest';
import { runCommand } from '@/api/exec';
import { useRepoSearch } from '@/hooks/useRepoSearch';
import { getDeployments } from '@/api/kubectl';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/api/exec', () => ({
  runCommand: vi.fn(),
}));

// Mock debounce to execute immediately
vi.mock('@galiprandi/react-tools', () => ({
  useDebounce: (val: any) => val,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('Security hardening verification', () => {
  it('useRepoSearch escapes search term to prevent command injection', async () => {
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'myuser', stderr: '', success: true }); // user login
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: '{"data":{"search":{"nodes":[],"repositoryCount":0}}}', stderr: '', success: true }); // graphql

    const maliciousTerm = "repo'; rm -rf /; '";
    const { result } = renderHook(() => useRepoSearch({ searchTerm: maliciousTerm }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const lastCall = vi.mocked(runCommand).mock.calls[vi.mocked(runCommand).mock.calls.length - 1][0];
    // Check if the malicious part is quoted and not free-standing
    // repo'; rm -rf /; ' -> 'repo'\''; rm -rf /; '\''
    expect(lastCall).toContain("-f searchTerm='repo'\\''; rm -rf /; '\\'''");
  });

  it('kubectl getDeployments escapes namespace and context', async () => {
    vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '', success: true });

    const maliciousNS = "default; id";
    const maliciousCtx = "myctx & whoami";

    // getDeployments uses sanitizeNamespace which throws if it doesn't match regex.
    await expect(getDeployments(maliciousNS, maliciousCtx)).rejects.toThrow();
  });

  it('kubectl getDeployments escapes valid-looking but tricky names', async () => {
    vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '', success: true });
    const trickyCtx = "context-with-hyphen";
    await getDeployments('default', trickyCtx);

    const lastCall = vi.mocked(runCommand).mock.calls[vi.mocked(runCommand).mock.calls.length - 1][0];
    expect(lastCall).toContain("--context=context-with-hyphen");
  });
});
