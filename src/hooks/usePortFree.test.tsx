import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePortFree } from './usePortFree';
import { findFreePort } from '@/api/portForward';
import { DEFAULT_START_PORT, DEFAULT_MAX_PORTS } from '@/config/portForward';

vi.mock('@/api/portForward', () => ({
  findFreePort: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePortFree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a free port', async () => {
    vi.mocked(findFreePort).mockResolvedValue(DEFAULT_START_PORT + 5);

    const { result } = renderHook(() => usePortFree(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBe(DEFAULT_START_PORT + 5));
    expect(findFreePort).toHaveBeenCalledWith(DEFAULT_START_PORT, DEFAULT_MAX_PORTS);
  });

  it('returns null when no free port found', async () => {
    vi.mocked(findFreePort).mockResolvedValue(null);

    const { result } = renderHook(() => usePortFree(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeNull());
  });
});
