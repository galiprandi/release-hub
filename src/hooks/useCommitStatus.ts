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
 * Resolves the GitHub repo from a commit SHA using GitHub's commit search API.
 * The mapping SHA → repo is immutable, so we cache it with staleTime: Infinity.
 */
async function resolveRepoFromSha(sha: string): Promise<string | null> {
	const searchResponse = await runCommand([
		"gh", "api", `search/commits?q=${sha}`, "--jq", ".items[0].repository.full_name",
	]);
	const repo = searchResponse.stdout.trim();
	return repo || null;
}

/**
 * Compares a commit against HEAD for a given repo.
 * The result changes with each push, so we use staleTime: 1min.
 */
async function compareCommit(repo: string, sha: string): Promise<{ status: string; aheadBy: number }> {
	const compareResponse = await runCommand([
		"gh", "api", `repos/${repo}/compare/${sha}...HEAD`,
		"--jq", "{status: .status, ahead_by: .ahead_by}",
	]);
	const parsed = JSON.parse(compareResponse.stdout.trim()) as { status: string; ahead_by: number };
	return { status: parsed.status, aheadBy: parsed.ahead_by };
}

/**
 * Given a commit SHA, resolves its GitHub repo and compares it against HEAD.
 *
 * Uses two separate queries:
 * - `git.repo-from-sha`: immutable cache (SHA → repo mapping never changes)
 * - `git.compare`: 1min staleTime (ahead_by changes with each push)
 *
 * @param sha - The commit SHA to check (7-40 hex chars)
 * @param enabled - Whether to fetch (default: true)
 * @returns `{ repo, status, behindBy, isLoading }`
 */
export function useCommitStatus(sha?: string, enabled = true): CommitStatusResult {
	const isValidSha = !!sha && SHA_REGEX.test(sha);
	const canFetch = enabled && isValidSha;

	// Step 1: resolve repo from SHA (immutable, cached forever)
	const { data: repo, isLoading: isResolvingRepo } = useQuery<string | null>({
		queryKey: queryKeys.git.compare(sha || "", "repo"),
		queryFn: async () => {
			if (!sha) return null;
			try {
				return await resolveRepoFromSha(sha);
			} catch {
				return null;
			}
		},
		enabled: canFetch,
		...applyCachePolicy("git"),
		staleTime: Infinity, // SHA → repo is immutable
	});

	// Step 2: compare against HEAD (changes with each push)
	const { data: compareData, isLoading: isComparing } = useQuery<{ status: string; aheadBy: number } | null>({
		queryKey: queryKeys.git.compare(sha || "", "search"),
		queryFn: async () => {
			if (!sha || !repo) return null;
			try {
				return await compareCommit(repo, sha);
			} catch {
				return null;
			}
		},
		enabled: canFetch && !!repo,
		...applyCachePolicy("git"),
		staleTime: 60 * 1000, // 1 minuto (compare cambia con cada push)
	});

	const data: ResolvedCommit | null = useMemo(() => {
		if (!repo) return null;
		if (!compareData) return null;
		return { repo, status: compareData.status, aheadBy: compareData.aheadBy };
	}, [repo, compareData]);

	const isLoading = canFetch && (isResolvingRepo || isComparing);

	return useMemo(() => {
		if (!canFetch || !data) {
			return { repo: null, status: "unknown" as const, behindBy: 0, isLoading };
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
