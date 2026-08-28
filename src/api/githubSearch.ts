import { runCommand } from '@/api/exec';

let cachedScope: string | null = null;
let inFlight: Promise<string> | null = null;

/**
 * Builds the GitHub search scope (user + organizations) dynamically from the
 * authenticated gh account: `user:{login} org:{orgA} org:{orgB} ...`.
 * Cached at module level: username and org membership rarely change within a session.
 */
export async function getRepoSearchScope(): Promise<string> {
	if (cachedScope) return cachedScope;
	if (inFlight) return inFlight;

	inFlight = (async () => {
		const userResult = await runCommand(['gh', 'api', '/user', '--jq', '.login']);
		const username = userResult.stdout.trim();

		let orgs: string[] = [];
		try {
			const orgsResult = await runCommand(['gh', 'api', 'user/orgs', '--jq', '.[].login']);
			orgs = orgsResult.stdout.trim().split('\n').filter(Boolean);
		} catch {
			// Sin permiso read:org o sin orgs: buscar solo por usuario
		}

		const scope = [`user:${username}`, ...orgs.map((org) => `org:${org}`)].join(' ');
		cachedScope = scope;
		return scope;
	})();

	try {
		return await inFlight;
	} finally {
		inFlight = null;
	}
}

/** Test-only: resets the module-level cache. */
export function resetRepoSearchScopeCache(): void {
	cachedScope = null;
	inFlight = null;
}
