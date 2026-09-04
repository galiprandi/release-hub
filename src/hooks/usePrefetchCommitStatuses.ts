import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { runCommand } from "@/api/exec";

const SHA_REGEX = /^[0-9a-f]{7,40}$/i;

/**
 * Prefetches repo resolution for multiple commit SHAs in parallel.
 * Deduplicates by SHA to avoid redundant calls.
 *
 * The SHA → repo mapping is immutable, so prefetching once benefits
 * all CommitCell instances that share the same SHA.
 */
export function usePrefetchCommitStatuses(shas: string[], enabled = true) {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!enabled) return;

		const uniqueShas = [...new Set(shas)].filter((sha) => SHA_REGEX.test(sha));

		uniqueShas.forEach((sha) => {
			queryClient.prefetchQuery({
				queryKey: queryKeys.git.compare(sha, "repo"),
				queryFn: async () => {
					try {
						const response = await runCommand([
							"gh", "api", `search/commits?q=${sha}`, "--jq", ".items[0].repository.full_name",
						]);
						return response.stdout.trim() || null;
					} catch {
						return null;
					}
				},
				staleTime: Infinity,
			});
		});
	}, [shas, enabled, queryClient]);
}
