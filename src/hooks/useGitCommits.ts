import { useInfiniteQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";

export interface GitCommit {
	hash: string;
	shortHash: string;
	author: string;
	date: string;
	subject: string;
	body: string;
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
		queryKey: queryKeys.git.commits(repo),
		queryFn: async ({ pageParam = 0 }) => {
			const page = pageParam as number;
			const perPage = 10;
			const response = await runCommand([
				'gh',
				'api',
				`repos/${repo}/commits`,
				'-F',
				`per_page=${perPage}`,
				'-F',
				`page=${page + 1}`,
				'--jq',
				'.[] | {hash: .sha, author: .commit.author.name, date: .commit.committer.date, message: .commit.message}'
			]);

			const lines = response.stdout
				.trim()
				.split("\n")
				.filter((line: string) => line?.startsWith("{"));
			const commits = lines
				.map((line: string) => {
					try {
						const parsed = JSON.parse(line);
						const message = parsed.message || "";
						const [subject, ...bodyParts] = message.split('\n');
						const body = bodyParts.join('\n').trim();
						return {
							hash: parsed.hash,
							shortHash: parsed.hash.slice(0, 7),
							author: parsed.author,
							date: parsed.date,
							subject: subject,
							body: body,
							message: message,
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
		...applyCachePolicy("git"),
	});

	const commits = data?.pages.flat();
	const latestCommit = commits?.[0];

	return { commits, latestCommit, ...rest };
}
