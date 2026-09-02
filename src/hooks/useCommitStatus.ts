import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";

export type CommitStatus = "up-to-date" | "behind" | "unknown";

export interface CommitStatusResult {
	repo: string | null;
	status: CommitStatus;
	behindBy: number;
	isLoading: boolean;
}

const SHA_REGEX = /^[0-9a-f]{7,40}$/i;

interface ResolvedCommit {
	repo: string | null;
	status: string;
	aheadBy: number;
}

/**
 * Resolves the GitHub repo from a commit SHA using GitHub's commit search API,
 * then compares that commit against HEAD to determine how far behind it is.
 *
 * Flow:
 * 1. `search/commits?q={sha}` → finds the repo the commit belongs to
 * 2. `repos/{repo}/compare/{sha}...HEAD` → ahead_by = commits behind
 *
 * System hook — no dependency on Kubernetes or naming conventions.
 * Can be used anywhere a commit SHA is available.
 */
async function resolveAndCompare(sha: string): Promise<ResolvedCommit> {
	// Step 1: find the repo from the commit SHA
	const searchResponse = await runCommand([
		"gh", "api", `search/commits?q=${sha}`, "--jq", ".items[0].repository.full_name",
	]);
	const repo = searchResponse.stdout.trim();
	if (!repo) {
		return { repo: null, status: "unknown", aheadBy: 0 };
	}

	// Step 2: compare commit against HEAD
	const compareResponse = await runCommand([
		"gh", "api", `repos/${repo}/compare/${sha}...HEAD`,
		"--jq", "{status: .status, ahead_by: .ahead_by}",
	]);
	const parsed = JSON.parse(compareResponse.stdout.trim()) as { status: string; ahead_by: number };
	return { repo, status: parsed.status, aheadBy: parsed.ahead_by };
}

/**
 * Given a commit SHA, resolves its GitHub repo and compares it against HEAD.
 *
 * @param sha - The commit SHA to check (7-40 hex chars)
 * @param enabled - Whether to fetch (default: true)
 * @returns `{ repo, status, behindBy, isLoading }`
 *
 * @example
 * const { status, behindBy } = useCommitStatus('3398b6f4bd5efb05c30b998df481c3d4ea6ddd98')
 * // → { status: 'behind', behindBy: 28, repo: 'Cencosud-xlabs/argentina-arcus' }
 */
export function useCommitStatus(sha?: string, enabled = true): CommitStatusResult {
	const isValidSha = !!sha && SHA_REGEX.test(sha);
	const canFetch = enabled && isValidSha;

	const { data, isLoading } = useQuery({
		queryKey: queryKeys.git.compare(sha || "", "search"),
		queryFn: async () => {
			if (!sha) return null;
			try {
				return await resolveAndCompare(sha);
			} catch {
				return null;
			}
		},
		enabled: canFetch,
		...applyCachePolicy("git"),
		staleTime: 60 * 1000, // 1 minuto (compare cambia con cada push)
	});

	return useMemo(() => {
		if (!canFetch || !data) {
			return { repo: null, status: "unknown" as const, behindBy: 0, isLoading: canFetch && isLoading };
		}
		if (!data.repo) {
			return { repo: null, status: "unknown" as const, behindBy: 0, isLoading: false };
		}
		if (data.status === "identical" || data.aheadBy === 0) {
			return { repo: data.repo, status: "up-to-date" as const, behindBy: 0, isLoading: false };
		}
		return { repo: data.repo, status: "behind" as const, behindBy: data.aheadBy, isLoading: false };
	}, [canFetch, data, isLoading]);
}
