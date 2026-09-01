import { useCommitStatus, type CommitStatusResult } from "@/hooks/useCommitStatus";

export type DeployedCommitStatus = CommitStatusResult["status"];
export type DeployedCommitStatusResult = CommitStatusResult;

interface UseDeployedCommitStatusOptions {
	namespace?: string;
	gitCommit?: string;
	enabled?: boolean;
}

/**
 * Thin wrapper around `useCommitStatus` for Kubernetes deployments.
 * Passes the deployment's GIT_COMMIT to the system hook, which resolves
 * the repo via GitHub's commit search API and compares against HEAD.
 *
 * `namespace` is kept for backward compatibility but no longer used
 * for repo resolution — the commit SHA is self-sufficient.
 */
export function useDeployedCommitStatus({
	gitCommit,
	enabled = true,
}: UseDeployedCommitStatusOptions): DeployedCommitStatusResult {
	return useCommitStatus(gitCommit, enabled);
}
