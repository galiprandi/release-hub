import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";
import { useUserCollections } from "@/hooks/useUserCollections";

export type DeployedCommitStatus = "up-to-date" | "behind" | "unknown";

export interface DeployedCommitStatusResult {
	repo: string | null;
	status: DeployedCommitStatus;
	behindBy: number;
	isLoading: boolean;
}

interface UseDeployedCommitStatusOptions {
	namespace: string;
	gitCommit?: string;
	enabled?: boolean;
}

const SHA_REGEX = /^[0-9a-f]{7,40}$/i;

/**
 * Resolves the GitHub repo (org/repo) for a Kubernetes namespace by matching
 * the namespace against the user's repo favorites and project repos
 * (convention: namespace = repo name).
 */
function resolveRepoForNamespace(namespace: string, favorites: string[], projectRepos: string[]): string | null {
	const candidates = [...favorites, ...projectRepos];
	return candidates.find((fullName) => fullName.split("/")[1] === namespace) || null;
}

/**
 * Compares the deployed GIT_COMMIT of a deployment against the default branch
 * HEAD of its GitHub repo. In `compare/{sha}...HEAD`, `ahead_by` is the number
 * of commits HEAD is ahead of the deploy — i.e. how far behind the deploy is.
 */
export function useDeployedCommitStatus({
	namespace,
	gitCommit,
	enabled = true,
}: UseDeployedCommitStatusOptions): DeployedCommitStatusResult {
	const { favorites, projects } = useUserCollections();

	const repo = useMemo(() => {
		const projectRepos = projects.flatMap((p) => p.repos || []);
		return resolveRepoForNamespace(namespace, favorites, projectRepos);
	}, [namespace, favorites, projects]);

	const isValidSha = !!gitCommit && SHA_REGEX.test(gitCommit);
	const canCompare = enabled && !!repo && isValidSha;

	const { data, isLoading } = useQuery({
		queryKey: queryKeys.git.compare(repo || "", gitCommit || ""),
		queryFn: async () => {
			const response = await runCommand([
				"gh",
				"api",
				`repos/${repo}/compare/${gitCommit}...HEAD`,
				"--jq",
				"{status: .status, ahead_by: .ahead_by}",
			]);
			try {
				return JSON.parse(response.stdout.trim()) as { status: string; ahead_by: number };
			} catch {
				return null;
			}
		},
		enabled: canCompare,
		...applyCachePolicy("git"),
	});

	return useMemo(() => {
		if (!canCompare || !data) {
			return { repo, status: "unknown" as const, behindBy: 0, isLoading: canCompare && isLoading };
		}
		if (data.status === "identical" || data.ahead_by === 0) {
			return { repo, status: "up-to-date" as const, behindBy: 0, isLoading: false };
		}
		return { repo, status: "behind" as const, behindBy: data.ahead_by, isLoading: false };
	}, [canCompare, data, repo, isLoading]);
}
