import { useInfiniteQuery } from '@tanstack/react-query';

export interface LogsAccumulatorOptions {
	/**
	 * Function to fetch logs. Accepts an optional cursor/offset parameter.
	 * Returns the logs as a string.
	 */
	fetchFn: (cursor?: number) => Promise<string>;
	
	/**
	 * Unique identifier for the logs source (e.g., container ID, pod name)
	 * Used for query key and cache management.
	 */
	resourceId: string;
	
	/**
	 * Whether auto-scroll is enabled (affects polling behavior)
	 */
	autoScrollEnabled?: boolean;
	
	/**
	 * Polling interval in milliseconds (default: 3000)
	 */
	refetchInterval?: number;
}

/**
 * Unified hook for accumulating logs from any source (Docker, Kubernetes, etc.).
 * 
 * Uses infinite query with cursor-based pagination to:
 * - Fetch initial logs without cursor
 * - Fetch incremental logs with cursor on subsequent requests
 * - Accumulate logs across pages
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useLogsAccumulator({
 *   fetchFn: (cursor) => getContainerLogs(containerId, 100, cursor),
 *   resourceId: containerId,
 *   autoScrollEnabled: true,
 * });
 * ```
 */
export function useLogsAccumulator({
	fetchFn,
	resourceId,
	autoScrollEnabled = true,
	refetchInterval = 3000,
}: LogsAccumulatorOptions) {
	return useInfiniteQuery({
		queryKey: ['logs', resourceId],
		queryFn: async ({ pageParam }) => {
			// pageParam is the cursor (timestamp/offset)
			// undefined means first page (no cursor)
			return fetchFn(pageParam);
		},
		initialPageParam: undefined as number | undefined,
		getNextPageParam: (lastPage) => {
			// If we got logs, return current timestamp as cursor for next page
			// If no logs or empty, don't fetch more
			if (lastPage && lastPage.trim()) {
				return Math.floor(Date.now() / 1000);
			}
			return undefined;
		},
		enabled: !!fetchFn,
		refetchInterval: autoScrollEnabled ? refetchInterval : false,
	});
}
