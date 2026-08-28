import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeployedCommitStatus } from './useDeployedCommitStatus';
import { runCommand } from '@/api/exec';
import { useUserCollections } from '@/hooks/useUserCollections';

vi.mock('@/api/exec', () => ({
	runCommand: vi.fn(),
}));

vi.mock('@/hooks/useUserCollections', () => ({
	useUserCollections: vi.fn(),
}));

type CollectionsMock = ReturnType<typeof useUserCollections>;

function mockCollections(favorites: string[], projectRepos: string[] = []) {
	vi.mocked(useUserCollections).mockReturnValue({
		favorites,
		projects: projectRepos.length > 0
			? [{ id: 'p1', name: 'P1', description: '', repos: projectRepos, deployments: [] }]
			: [],
	} as unknown as CollectionsMock);
}

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const SHA = '4b34588f308580bdbab9a86d0248b8729442e4c9';

describe('useDeployedCommitStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('retorna up-to-date cuando el commit desplegado es idéntico a HEAD', async () => {
		mockCollections(['Cencosud-xlab/milocal-ar']);
		vi.mocked(runCommand).mockResolvedValueOnce({
			stdout: JSON.stringify({ status: 'identical', ahead_by: 0 }),
			stderr: '',
			success: true,
		});

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'milocal-ar', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('up-to-date'));
		expect(result.current.repo).toBe('Cencosud-xlab/milocal-ar');
		expect(result.current.behindBy).toBe(0);
	});

	it('retorna behind con la cantidad de commits de atraso', async () => {
		mockCollections(['Cencosud-xlab/milocal-ar']);
		vi.mocked(runCommand).mockResolvedValueOnce({
			stdout: JSON.stringify({ status: 'ahead', ahead_by: 3 }),
			stderr: '',
			success: true,
		});

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'milocal-ar', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('behind'));
		expect(result.current.behindBy).toBe(3);
	});

	it('resuelve el repo desde los repos de proyectos', async () => {
		mockCollections([], ['Cencosud-xlab/milocal-ar']);
		vi.mocked(runCommand).mockResolvedValueOnce({
			stdout: JSON.stringify({ status: 'identical', ahead_by: 0 }),
			stderr: '',
			success: true,
		});

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'milocal-ar', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('up-to-date'));
		expect(result.current.repo).toBe('Cencosud-xlab/milocal-ar');
	});

	it('retorna unknown sin fetch cuando el namespace no matchea ningún repo', () => {
		mockCollections(['Cencosud-xlab/otro-repo']);

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'milocal-ar', gitCommit: SHA }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(result.current.repo).toBe(null);
		expect(runCommand).not.toHaveBeenCalled();
	});

	it('retorna unknown sin fetch cuando el sha es inválido', () => {
		mockCollections(['Cencosud-xlab/milocal-ar']);

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'milocal-ar', gitCommit: 'no-es-un-sha;rm' }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(runCommand).not.toHaveBeenCalled();
	});

	it('retorna unknown cuando no hay gitCommit', () => {
		mockCollections(['Cencosud-xlab/milocal-ar']);

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'milocal-ar' }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(runCommand).not.toHaveBeenCalled();
	});

	it('retorna unknown si la respuesta de gh no es JSON válido', async () => {
		mockCollections(['Cencosud-xlab/milocal-ar']);
		vi.mocked(runCommand).mockResolvedValueOnce({
			stdout: 'invalid-json',
			stderr: '',
			success: true,
		});

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'milocal-ar', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.status).toBe('unknown');
	});
});
