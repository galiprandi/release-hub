import { useQuery } from "@tanstack/react-query";
import { runCommand } from "../api/exec";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";
import { sanitizeRepo } from "@/lib/utils";

interface PrStatus {
	status: "open" | "closed" | "merged";
	mergeable: boolean | null;
	mergeable_state: "clean" | "unstable" | "dirty" | null;
	merged: boolean;
	auto_merge: {
		enabled_by?: {
			login: string;
		};
		merge_method: string;
	} | null;
}

export function usePrStatus(
	repo: string,
	prNumber: string,
	pollInterval?: number,
) {
	return useQuery({
		queryKey: queryKeys.pr.status(repo, Number(prNumber)),
		queryFn: async () => {
			const sanitizedRepo = sanitizeRepo(repo);
			const sanitizedPrNumber = Number(prNumber);
			if (isNaN(sanitizedPrNumber)) throw new Error('Invalid PR number');

			const { stdout } = await runCommand(['gh', 'api', `repos/${sanitizedRepo}/pulls/${sanitizedPrNumber}`]);
			const data = JSON.parse(stdout);

			return {
				status: data.state as PrStatus["status"],
				mergeable: data.mergeable,
				mergeable_state: data.mergeable_state,
				merged: data.merged,
				auto_merge: data.auto_merge,
			} as PrStatus;
		},
		enabled: !!prNumber,
		refetchInterval: pollInterval,
		...applyCachePolicy("pr"),
	});
}
