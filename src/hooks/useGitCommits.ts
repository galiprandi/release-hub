import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";

export interface GitCommit {
	hash: string;
	shortHash: string;
	author: string;
	date: string;
	message: string;
}

interface UseGitCommitsOptions {
	repo: string;
	limit?: number;
	enabled?: boolean;
}

export function useGitCommits({
	repo,
	limit = 15,
	enabled = true,
}: UseGitCommitsOptions) {
	const { data: commits, ...rest } = useQuery<GitCommit[]>({
		queryKey: ["git", "commits", repo, limit],
		queryFn: async () => {
			const command = `gh api repos/${repo}/commits --paginate --jq '.[] | {hash: .sha, author: .commit.author.name, date: .commit.committer.date, message: .commit.message}'`;
			const response = await runCommand(command);

			const lines = response.stdout
				.trim()
				.split("\n")
				.filter((line: string) => line?.startsWith("{"));
			const allCommits = lines
				.map((line: string) => {
					try {
						const parsed = JSON.parse(line);
						return {
							hash: parsed.hash,
							shortHash: parsed.hash.slice(0, 7),
							author: parsed.author,
							date: parsed.date,
							message: parsed.message,
						};
					} catch {
						return null;
					}
				})
				.filter(Boolean) as GitCommit[];

			return allCommits.slice(0, limit);
		},
		enabled: enabled && !!repo,
		staleTime: 30 * 60 * 1000, // 30 minutos - commits históricos no cambian frecuentemente
		gcTime: 60 * 60 * 1000, // 1 hora - mantener en cache por más tiempo
	});

	const latestCommit = commits?.[0];

	return { commits, latestCommit, ...rest };
}
