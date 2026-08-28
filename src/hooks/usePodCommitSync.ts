import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { podMatchesSelector, type PodCommitInfo } from "@/api/kubectl";

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
	namespace: string;
	context?: string;
	selector?: Record<string, string>;
	specCommit?: string;
	enabled?: boolean;
}

/**
 * Verifies that every pod of a deployment is running the same GIT_COMMIT as
 * the deployment spec. Detects incomplete rollouts where old pods survive a
 * failed deploy (pods keep the env of the ReplicaSet that created them).
 *
 * Performance: fetches ALL pods of the namespace in a single kubectl call,
 * shared across every deployment cell of the same namespace+context (React
 * Query dedupes by key), and filters client-side by the deployment selector
 * (already present in the deployment JSON, no extra call).
 */
export function usePodCommitSync({
	namespace,
	context,
	selector,
	specCommit,
	enabled = true,
}: UsePodCommitSyncOptions): PodCommitSyncResult {
	const hasSelector = !!selector && Object.keys(selector).length > 0;
	const canCheck = enabled && !!namespace && !!specCommit && hasSelector;

	const { data: nsPods, isLoading } = useQuery({
		queryKey: queryKeys.kubectl.podCommits(namespace, context),
		queryFn: async () => {
			const { getNamespacePodCommits } = await import("@/api/kubectl");
			return getNamespacePodCommits(namespace, context);
		},
		enabled: canCheck,
		// No usamos la policy `kubectl` (staleTime 0): esta query es costosa y
		// se comparte entre celdas. 60s de frescura sin persistir (VPN dependency).
		staleTime: 60 * 1000,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
	});

	return useMemo(() => {
		if (!canCheck || !nsPods) {
			return { status: "unknown" as const, pods: [], syncedCount: 0, totalCount: 0, stalePods: [], isLoading: canCheck && isLoading };
		}
		const pods = nsPods.filter((p) => podMatchesSelector(p.labels, selector!));
		if (pods.length === 0) {
			return { status: "unknown" as const, pods: [], syncedCount: 0, totalCount: 0, stalePods: [], isLoading: false };
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
	}, [canCheck, nsPods, selector, specCommit, isLoading]);
}
