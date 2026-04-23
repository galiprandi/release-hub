import { useInfiniteQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";

export interface GitTag {
	name: string;
	commit: string;
	date: string;
	author: {
		name: string;
		email: string;
		date: string;
	};
	zipball_url: string;
	tarball_url: string;
}

interface UseGitTagsOptions {
	repo: string;
	enabled?: boolean;
}

// Tipo intermedio para el parsing inicial de tags desde la API
interface GitTagFromAPI {
	name: string;
	commit: string;
	zipball_url: string;
	tarball_url: string;
}

export function useGitTags({
	repo,
	enabled = true,
}: UseGitTagsOptions) {
	const { data, ...rest } = useInfiniteQuery<GitTag[]>({
		queryKey: ["git", "tags", repo],
		queryFn: async ({ pageParam = 0 }) => {
			const page = pageParam as number;
			const perPage = 10;
			// First get the tags list with pagination
			const tagsCommand = `gh api "repos/${repo}/tags?per_page=${perPage}&page=${page + 1}" --jq '.[] | {name: .name, commit: .commit.sha, zipball_url: .zipball_url, tarball_url: .tarball_url}'`;
			const tagsResponse = await runCommand(tagsCommand);

			const tagLines = tagsResponse.stdout
				.trim()
				.split("\n")
				.filter((line: string) => line?.startsWith("{"));

			const tags = tagLines
				.map((line: string) => {
					try {
						return JSON.parse(line) as GitTagFromAPI;
					} catch {
						return null;
					}
				})
				.filter(Boolean) as GitTagFromAPI[];

			// Get tag details for each tag (including tagger date)
			const tagsWithDetails = await Promise.all(
				tags.map(async (tag: GitTagFromAPI) => {
					try {
						// Get the tag reference to check if it's annotated
						const refCommand = `gh api repos/${repo}/git/refs/tags/${tag.name} --jq '.object.type'`;
						const refResponse = await runCommand(refCommand);
						const objectType = refResponse.stdout.trim();

						let tagDate = null;

						// If it's an annotated tag, get the tagger date
						if (objectType === 'tag') {
							const tagCommand = `gh api repos/${repo}/git/refs/tags/${tag.name} --jq '.object.sha'`;
							const tagShaResponse = await runCommand(tagCommand);
							const tagSha = tagShaResponse.stdout.trim();

							const taggerCommand = `gh api repos/${repo}/git/tags/${tagSha} --jq '.tagger.date'`;
							const taggerResponse = await runCommand(taggerCommand);
							tagDate = taggerResponse.stdout.trim();
						}

						// Get commit details for author info
						const commitCommand = `gh api repos/${repo}/commits/${tag.commit} --jq '{message: .message, author: {name: .commit.author.name, email: .commit.author.email, date: .commit.author.date}}'`;
						const commitResponse = await runCommand(commitCommand);
						const commitDetails = JSON.parse(commitResponse.stdout.trim());

						return {
							...tag,
							...commitDetails,
							date: tagDate || commitDetails.author.date,
						};
					} catch {
						// Fallback if details fail, get commit date
						try {
							const commitCommand = `gh api repos/${repo}/commits/${tag.commit} --jq '{date: .commit.committer.date, message: .message, author: {name: .commit.author.name, email: .commit.author.email, date: .commit.author.date}}'`;
							const commitResponse = await runCommand(commitCommand);
							const commitDetails = JSON.parse(commitResponse.stdout.trim());

							return {
								...tag,
								...commitDetails,
								date: commitDetails.date || commitDetails.author.date,
							};
						} catch {
							// Final fallback
							return {
								...tag,
								date: null,
								message: null,
								author: { name: null, email: null, date: null },
							};
						}
					}
				}),
			);

			return tagsWithDetails.sort(
				(a: GitTag, b: GitTag) =>
					new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
			);
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

	const tags = data?.pages.flat();
	const latestTag = tags?.[0];

	return { tags, latestTag, ...rest };
}
