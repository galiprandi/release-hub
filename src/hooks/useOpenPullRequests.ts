import { useQuery } from "@tanstack/react-query";
import { runCommand } from "../api/exec";
import { quote } from "@/utils/shell";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";

interface OpenPullRequestsResult {
	count: number;
	repoUrl: string;
}

export function useOpenPullRequests(repo: string) {
	return useQuery<OpenPullRequestsResult>({
		queryKey: queryKeys.pr.list(repo),
		queryFn: async () => {
			const command = `gh pr list --repo ${quote(repo)} --state open --json number`;
			const { stdout } = await runCommand(command);
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
