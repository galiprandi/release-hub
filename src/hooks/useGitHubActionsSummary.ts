import { useQuery } from "@tanstack/react-query";
import { runCommand } from "../api/exec";

export interface GitHubActionsSummary {
	total: number;
	running: number;
	failed: number;
	repoUrl: string;
}

export function useGitHubActionsSummary(repo: string) {
	return useQuery<GitHubActionsSummary>({
		queryKey: ["github-actions", "summary", repo],
		queryFn: async () => {
			const { stdout } = await runCommand([
				'gh',
				'api',
				`repos/${repo}/actions/runs`,
				'-F',
				'per_page=5',
				'--jq',
				'.workflow_runs[] | {status, conclusion}'
			]);
			const lines = stdout
				.trim()
				.split("\n")
				.filter((line: string) => line?.startsWith("{"));

			const runs = lines
				.map((line: string) => {
					try {
						return JSON.parse(line);
					} catch {
						return null;
					}
				})
				.filter(Boolean) as { status: string; conclusion: string | null }[];

			const [org, name] = repo.split("/");
			return {
				total: runs.length,
				running: runs.filter((r) => r.status === "in_progress").length,
				failed: runs.filter((r) => r.conclusion === "failure").length,
				repoUrl: `https://github.com/${org}/${name}/actions`,
			};
		},
		enabled: !!repo,
		staleTime: 30 * 1000,
		gcTime: 2 * 60 * 1000,
	});
}
