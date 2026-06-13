import { useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export interface Commit {
	hash: string;
	shortHash: string;
	author: string;
	date: string;
	message: string;
	subject: string;
	body: string;
}

export interface Tag {
	name: string;
	commit: string;
}

export interface RepoDetails {
	fullName: string;
	pendingCount: number;
	latestTag: Tag | null;
	commits: Commit[];
	prCount: number;
	actions: {
		total: number;
		running: number;
		failed: number;
	};
}

/**
 * Hook to retrieve repository dashboard details from the cache.
 * This centralizes the logic and ensures type safety across dashboard cells.
 */
export function useRepoDashboardDetails(fullName: string) {
	const queryKey = queryKeys.git.dashboardDetails(fullName);

	// We use useQueries to peek into the cache.
	// enabled: false ensures we don't trigger new fetches here,
	// as the parent component (ReposTable) is responsible for data fetching.
	const results = useQueries({
		queries: [
			{
				queryKey,
				enabled: false,
			},
		],
	});

	const result = results[0];

	// Note: result.isLoading will be false if enabled is false.
	// We check for data presence to determine if we are "loading" (waiting for cache to be populated by parent).
	const hasData = !!result?.data;

	return {
		data: result?.data as RepoDetails | undefined,
		isLoading: !hasData,
		error: result?.error,
	};
}
