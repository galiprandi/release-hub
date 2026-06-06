import { useQuery } from "@tanstack/react-query";
import { runCommand } from "../api/exec";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";
import { sanitizeRepo } from "@/lib/utils";

interface OpenPullRequestsResult {
	count: number;
	repoUrl: string;
}

export function useOpenPullRequests(repo: string) {
	return useQuery<OpenPullRequestsResult>({
		queryKey: queryKeys.pr.list(repo),
		queryFn: async () => {
			const sanitizedRepo = sanitizeRepo(repo);
			const { stdout } = await runCommand(['gh', 'pr', 'list', '--repo', sanitizedRepo, '--state', 'open', '--json', 'number']);
			const prs = JSON.parse(stdout);
			const count = Array.isArray(prs) ? prs.length : 0;
			const [org, name] = repo.split("/");
			return {
				count,
				repoUrl: `https://github.com/${org}/${name}/pulls`,
			};
		},
		enabled: !!repo,
		...applyCachePolicy("pr"),
	});
}
