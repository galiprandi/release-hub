import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePodCommitSync } from './usePodCommitSync';
import { getPodCommits } from '@/api/kubectl';

vi.mock('@/api/kubectl', () => ({
	getPodCommits: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const SPEC_COMMIT = '4b34588f308580bdbab9a86d0248b8729442e4c9';

describe('usePodCommitSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('retorna synced cuando todos los pods corren el commit del spec', async () => {
		vi.mocked(getPodCommits).mockResolvedValueOnce([
			{ name: 'bff-dp-a', phase: 'Running', gitCommit: SPEC_COMMIT, images: ['api:aaa'] },
			{ name: 'bff-dp-b', phase: 'Running', gitCommit: SPEC_COMMIT, images: ['api:aaa'] },
		]);

		const { result } = renderHook(
			() => usePodCommitSync({ deploymentName: 'bff-dp', namespace: 'milocal-ar', specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('synced'));
		expect(result.current.syncedCount).toBe(2);
		expect(result.current.totalCount).toBe(2);
		expect(result.current.stalePods).toEqual([]);
	});

	it('retorna drift cuando algún pod corre un commit viejo', async () => {
		vi.mocked(getPodCommits).mockResolvedValueOnce([
			{ name: 'bff-dp-new', phase: 'Running', gitCommit: SPEC_COMMIT, images: ['api:aaa'] },
			{ name: 'bff-dp-old', phase: 'Running', gitCommit: 'oldsha9999', images: ['api:bbb'] },
		]);

		const { result } = renderHook(
			() => usePodCommitSync({ deploymentName: 'bff-dp', namespace: 'milocal-ar', specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('drift'));
		expect(result.current.syncedCount).toBe(1);
		expect(result.current.totalCount).toBe(2);
		expect(result.current.stalePods).toHaveLength(1);
		expect(result.current.stalePods[0].name).toBe('bff-dp-old');
	});

	it('retorna drift cuando un pod no expone GIT_COMMIT', async () => {
		vi.mocked(getPodCommits).mockResolvedValueOnce([
			{ name: 'bff-dp-x', phase: 'Running', gitCommit: undefined, images: ['api:ccc'] },
		]);

		const { result } = renderHook(
			() => usePodCommitSync({ deploymentName: 'bff-dp', namespace: 'milocal-ar', specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('drift'));
	});

	it('retorna unknown sin fetch cuando no hay specCommit', () => {
		const { result } = renderHook(
			() => usePodCommitSync({ deploymentName: 'bff-dp', namespace: 'milocal-ar' }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(getPodCommits).not.toHaveBeenCalled();
	});

	it('retorna unknown cuando no hay pods', async () => {
		vi.mocked(getPodCommits).mockResolvedValueOnce([]);

		const { result } = renderHook(
			() => usePodCommitSync({ deploymentName: 'bff-dp', namespace: 'milocal-ar', specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.status).toBe('unknown');
	});
});
