import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePortForward } from './usePortForward';
import { startPortForward, stopPortForward, getActivePortForwards } from '@/api/portForward';
import { DEFAULT_START_PORT } from '@/config/portForward';

vi.mock('@/api/portForward', () => ({
  startPortForward: vi.fn(),
  stopPortForward: vi.fn(),
  getActivePortForwards: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePortForward', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with idle status', () => {
    vi.mocked(getActivePortForwards).mockResolvedValue([]);
    const { result } = renderHook(
      () => usePortForward({ deployment: 'app', namespace: 'default' }),
      { wrapper: createWrapper() }
    );
    expect(result.current.status).toBe('idle');
    expect(result.current.isActive).toBe(false);
  });

  it('connects successfully', async () => {
    let active: { deployment: string; namespace: string; context: string; localPort: number; remotePort: number }[] = [];
    vi.mocked(getActivePortForwards).mockImplementation(() => Promise.resolve(active));
    vi.mocked(startPortForward).mockImplementation(() => {
      active = [{ deployment: 'app', namespace: 'default', context: '', localPort: DEFAULT_START_PORT + 1, remotePort: 8080 }];
      return Promise.resolve({ success: true });
    });

    const { result } = renderHook(
      () => usePortForward({ deployment: 'app', namespace: 'default' }),
      { wrapper: createWrapper() }
    );

    await result.current.connect(DEFAULT_START_PORT + 1, 8080);

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(startPortForward).toHaveBeenCalledWith({
      deployment: 'app',
      namespace: 'default',
      context: undefined,
      localPort: DEFAULT_START_PORT + 1,
      remotePort: 8080,
    });
  });

  it('disconnects successfully', async () => {
    let active = [
      { deployment: 'app', namespace: 'default', context: '', localPort: DEFAULT_START_PORT + 1, remotePort: 8080 },
    ];
    vi.mocked(getActivePortForwards).mockImplementation(() => Promise.resolve(active));
    vi.mocked(stopPortForward).mockImplementation(() => {
      active = [];
      return Promise.resolve({ success: true });
    });

    const { result } = renderHook(
      () => usePortForward({ deployment: 'app', namespace: 'default' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isActive).toBe(true));

    await result.current.disconnect();

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(stopPortForward).toHaveBeenCalledWith({ deployment: 'app', namespace: 'default', context: undefined });
  });

  it('reports error on failed connect', async () => {
    vi.mocked(getActivePortForwards).mockResolvedValue([]);
    vi.mocked(startPortForward).mockRejectedValue(new Error('port in use'));

    const { result } = renderHook(
      () => usePortForward({ deployment: 'app', namespace: 'default' }),
      { wrapper: createWrapper() }
    );

    await expect(result.current.connect(DEFAULT_START_PORT + 1, 8080)).rejects.toThrow('port in use');

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('port in use');
  });
});
