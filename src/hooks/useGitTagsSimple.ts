import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";
import { quote } from "@/utils/shell";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";

export interface GitTagSimple {
	name: string;
	commit: string;
	zipball_url: string;
	tarball_url: string;
}

interface UseGitTagsSimpleOptions {
	repo: string;
	limit?: number;
	enabled?: boolean;
}

export function useGitTagsSimple({
	repo,
	limit = 15,
	enabled = true,
}: UseGitTagsSimpleOptions) {
	const { data: tags, ...rest } = useQuery<GitTagSimple[]>({
		queryKey: queryKeys.git.tags(repo, limit),
		queryFn: async () => {
			const command = `gh api ${quote(`repos/${repo}/tags`)} --paginate --jq '.[] | {name: .name, commit: .commit.sha, zipball_url: .zipball_url, tarball_url: .tarball_url}'`;
			const response = await runCommand(command);

			const tagLines = response.stdout
				.trim()
				.split("\n")
				.filter((line: string) => line?.startsWith("{"));

			const tags = tagLines
				.map((line: string) => {
					try {
						return JSON.parse(line) as GitTagSimple;
					} catch {
						return null;
					}
				})
				.filter(Boolean) as GitTagSimple[];

			return tags.slice(0, limit);
		},
		enabled: enabled && !!repo,
		...applyCachePolicy("git"),
	});

	const latestTag = tags?.[0];

	return { tags, latestTag, ...rest };
}
