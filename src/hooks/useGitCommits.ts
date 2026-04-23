import { useInfiniteQuery } from "@tanstack/react-query";
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
	enabled?: boolean;
}

export function useGitCommits({
	repo,
	enabled = true,
}: UseGitCommitsOptions) {
	const { data, ...rest } = useInfiniteQuery<GitCommit[]>({
		queryKey: ["git", "commits", repo],
		queryFn: async ({ pageParam = 0 }) => {
			const page = pageParam as number;
			const perPage = 10;
			const command = `gh api "repos/${repo}/commits?per_page=${perPage}&page=${page + 1}" --jq '.[] | {hash: .sha, author: .commit.author.name, date: .commit.committer.date, message: .commit.message}'`;
			const response = await runCommand(command);

			const lines = response.stdout
				.trim()
				.split("\n")
				.filter((line: string) => line?.startsWith("{"));
			const commits = lines
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

			return commits;
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < 10) return undefined;
			return allPages.length;
		},
		enabled: enabled && !!repo,
		staleTime: 30000, // 30 segundos - permitir ver cambios recientes
		gcTime: 60 * 60 * 1000, // 1 hora - mantener en cache por más tiempo
	});

	const commits = data?.pages.flat();
	const latestCommit = commits?.[0];

	return { commits, latestCommit, ...rest };
}
