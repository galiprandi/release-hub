import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeployedCommitStatus } from './useDeployedCommitStatus';
import { runCommand } from '@/api/exec';

vi.mock('@/api/exec', () => ({
	runCommand: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const SHA = '4b34588f308580bdbab9a86d0248b8729442e4c9';

function mockSearchAndCompare(repo: string, status: string, aheadBy: number) {
	vi.mocked(runCommand)
		.mockResolvedValueOnce({
			stdout: repo,
			stderr: '',
			success: true,
		})
		.mockResolvedValueOnce({
			stdout: JSON.stringify({ status, ahead_by: aheadBy }),
			stderr: '',
			success: true,
		});
}

describe('useDeployedCommitStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('retorna up-to-date cuando el commit desplegado es idéntico a HEAD', async () => {
		mockSearchAndCompare('acme-org/my-product', 'identical', 0);

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'my-product', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('up-to-date'));
		expect(result.current.repo).toBe('acme-org/my-product');
		expect(result.current.behindBy).toBe(0);
	});

	it('retorna behind con la cantidad de commits de atraso', async () => {
		mockSearchAndCompare('acme-org/my-product', 'ahead', 3);

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'my-product', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('behind'));
		expect(result.current.behindBy).toBe(3);
	});

	it('resuelve el repo desde el SHA sin depender del namespace', async () => {
		mockSearchAndCompare('acme-org/my-product', 'identical', 0);

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'completely-different', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.status).toBe('up-to-date'));
		expect(result.current.repo).toBe('acme-org/my-product');
	});

	it('retorna unknown cuando search/commits no encuentra el repo', async () => {
		vi.mocked(runCommand).mockResolvedValueOnce({
			stdout: '',
			stderr: '',
			success: true,
		});

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'my-product', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.status).toBe('unknown');
		expect(result.current.repo).toBe(null);
	});

	it('retorna unknown sin fetch cuando el sha es inválido', () => {
		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'my-product', gitCommit: 'no-es-un-sha;rm' }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(runCommand).not.toHaveBeenCalled();
	});

	it('retorna unknown cuando no hay gitCommit', () => {
		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'my-product' }),
			{ wrapper }
		);

		expect(result.current.status).toBe('unknown');
		expect(runCommand).not.toHaveBeenCalled();
	});

	it('retorna unknown si la respuesta de gh no es JSON válido', async () => {
		vi.mocked(runCommand)
			.mockResolvedValueOnce({
				stdout: 'acme-org/my-product',
				stderr: '',
				success: true,
			})
			.mockResolvedValueOnce({
				stdout: 'invalid-json',
				stderr: '',
				success: true,
			});

		const { result } = renderHook(
			() => useDeployedCommitStatus({ namespace: 'my-product', gitCommit: SHA }),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.status).toBe('unknown');
	});
});
