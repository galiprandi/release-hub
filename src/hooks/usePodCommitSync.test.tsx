import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePodCommitSync } from './usePodCommitSync';
import { getNamespacePodCommits, podMatchesSelector } from '@/api/kubectl';

vi.mock('@/api/kubectl', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/api/kubectl')>();
	return {
		podMatchesSelector: actual.podMatchesSelector,
		getNamespacePodCommits: vi.fn(),
	};
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const SPEC_COMMIT = '4b34588f308580bdbab9a86d0248b8729442e4c9';
const SELECTOR = { app: 'bff' };

describe('podMatchesSelector', () => {
	it('matchea cuando todas las labels del selector están en el pod', () => {
		expect(podMatchesSelector({ app: 'bff', extra: 'x' }, { app: 'bff' })).toBe(true);
		expect(podMatchesSelector({ app: 'portal' }, { app: 'bff' })).toBe(false);
		expect(podMatchesSelector({}, { app: 'bff' })).toBe(false);
	});
});

describe('usePodCommitSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('retorna synced cuando todos los pods del selector corren el commit del spec', async () => {
		vi.mocked(getNamespacePodCommits).mockResolvedValueOnce([
			{ name: 'bff-dp-a', phase: 'Running', gitCommit: SPEC_COMMIT, images: ['api:aaa'], labels: { app: 'bff' } },
			{ name: 'bff-dp-b', phase: 'Running', gitCommit: SPEC_COMMIT, images: ['api:aaa'], labels: { app: 'bff' } },
			{ name: 'portal-dp-x', phase: 'Running', gitCommit: 'othersha', images: ['web:bbb'], labels: { app: 'portal' } },
		]);

		const { result } = renderHook(
			() => usePodCommitSync({ namespace: 'my-product', selector: SELECTOR, specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('synced'));
		expect(result.current.syncedCount).toBe(2);
		expect(result.current.totalCount).toBe(2);
		expect(result.current.stalePods).toEqual([]);
	});

	it('retorna drift cuando algún pod del selector corre un commit viejo', async () => {
		vi.mocked(getNamespacePodCommits).mockResolvedValueOnce([
			{ name: 'bff-dp-new', phase: 'Running', gitCommit: SPEC_COMMIT, images: ['api:aaa'], labels: { app: 'bff' } },
			{ name: 'bff-dp-old', phase: 'Running', gitCommit: 'oldsha9999', images: ['api:bbb'], labels: { app: 'bff' } },
		]);

		const { result } = renderHook(
			() => usePodCommitSync({ namespace: 'my-product', selector: SELECTOR, specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('drift'));
		expect(result.current.syncedCount).toBe(1);
		expect(result.current.totalCount).toBe(2);
		expect(result.current.stalePods).toHaveLength(1);
		expect(result.current.stalePods[0].name).toBe('bff-dp-old');
	});

	it('retorna drift cuando un pod no expone GIT_COMMIT', async () => {
		vi.mocked(getNamespacePodCommits).mockResolvedValueOnce([
			{ name: 'bff-dp-x', phase: 'Running', gitCommit: undefined, images: ['api:ccc'], labels: { app: 'bff' } },
		]);

		const { result } = renderHook(
			() => usePodCommitSync({ namespace: 'my-product', selector: SELECTOR, specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('drift'));
	});

	it('retorna unknown sin fetch cuando no hay specCommit', () => {
		const { result } = renderHook(
			() => usePodCommitSync({ namespace: 'my-product', selector: SELECTOR }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(getNamespacePodCommits).not.toHaveBeenCalled();
	});

	it('retorna unknown sin fetch cuando no hay selector', () => {
		const { result } = renderHook(
			() => usePodCommitSync({ namespace: 'my-product', specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(getNamespacePodCommits).not.toHaveBeenCalled();
	});

	it('retorna unknown cuando ningún pod matchea el selector', async () => {
		vi.mocked(getNamespacePodCommits).mockResolvedValueOnce([
			{ name: 'portal-dp-x', phase: 'Running', gitCommit: 'othersha', images: ['web:bbb'], labels: { app: 'portal' } },
		]);

		const { result } = renderHook(
			() => usePodCommitSync({ namespace: 'my-product', selector: SELECTOR, specCommit: SPEC_COMMIT }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.status).toBe('unknown');
	});
});
