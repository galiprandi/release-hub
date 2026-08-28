import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";
import type { PodCommitInfo } from "@/api/kubectl";

export type PodSyncStatus = "synced" | "drift" | "unknown";

export interface PodCommitSyncResult {
	status: PodSyncStatus;
	pods: PodCommitInfo[];
	syncedCount: number;
	totalCount: number;
	stalePods: PodCommitInfo[];
	isLoading: boolean;
}

interface UsePodCommitSyncOptions {
	deploymentName: string;
	namespace: string;
	context?: string;
	specCommit?: string;
	enabled?: boolean;
}

/**
 * Verifies that every pod of a deployment is running the same GIT_COMMIT as
 * the deployment spec. Detects incomplete rollouts where old pods survive a
 * failed deploy (pods keep the env of the ReplicaSet that created them).
 */
export function usePodCommitSync({
	deploymentName,
	namespace,
	context,
	specCommit,
	enabled = true,
}: UsePodCommitSyncOptions): PodCommitSyncResult {
	const canCheck = enabled && !!deploymentName && !!namespace && !!specCommit;

	const { data: pods, isLoading } = useQuery({
		queryKey: queryKeys.kubectl.podCommits(namespace, deploymentName, context),
		queryFn: async () => {
			const { getPodCommits } = await import("@/api/kubectl");
			return getPodCommits(deploymentName, namespace, context);
		},
		enabled: canCheck,
		...applyCachePolicy("kubectl"),
	});

	return useMemo(() => {
		if (!canCheck || !pods || pods.length === 0) {
			return { status: "unknown" as const, pods: [], syncedCount: 0, totalCount: 0, stalePods: [], isLoading: canCheck && isLoading };
		}
		const stalePods = pods.filter((p) => p.gitCommit !== specCommit);
		const syncedCount = pods.length - stalePods.length;
		return {
			status: stalePods.length === 0 ? ("synced" as const) : ("drift" as const),
			pods,
			syncedCount,
			totalCount: pods.length,
			stalePods,
			isLoading: false,
		};
	}, [canCheck, pods, specCommit, isLoading]);
}
