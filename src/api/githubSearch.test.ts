import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepoSearchScope, resetRepoSearchScopeCache } from './githubSearch';
import { runCommand } from '@/api/exec';

vi.mock('@/api/exec', () => ({
	runCommand: vi.fn(),
}));

describe('getRepoSearchScope', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetRepoSearchScopeCache();
	});

	it('construye el scope con user y todas las orgs', async () => {
		vi.mocked(runCommand)
			.mockResolvedValueOnce({ stdout: 'octocat\n', stderr: '', success: true })
			.mockResolvedValueOnce({ stdout: 'org-one\norg-two\n', stderr: '', success: true });

		const scope = await getRepoSearchScope();
		expect(scope).toBe('user:octocat org:org-one org:org-two');
	});

	it('cae a user-only si no puede listar orgs', async () => {
		vi.mocked(runCommand)
			.mockResolvedValueOnce({ stdout: 'octocat\n', stderr: '', success: true })
			.mockRejectedValueOnce(new Error('missing read:org scope'));

		const scope = await getRepoSearchScope();
		expect(scope).toBe('user:octocat');
	});

	it('cachea el resultado a nivel módulo', async () => {
		vi.mocked(runCommand)
			.mockResolvedValueOnce({ stdout: 'octocat\n', stderr: '', success: true })
			.mockResolvedValueOnce({ stdout: 'org-one\n', stderr: '', success: true });

		await getRepoSearchScope();
		await getRepoSearchScope();
		expect(runCommand).toHaveBeenCalledTimes(2);
	});
});
