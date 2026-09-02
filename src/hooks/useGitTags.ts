import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";

export interface GitTag {
	name: string;
	commit: string;
	date: string;
	message: string;
	author: {
		name: string;
		email: string;
		date: string;
	};
}

interface UseGitTagsOptions {
	repo: string;
	enabled?: boolean;
}

const PER_PAGE = 10;

const TAGS_QUERY = (owner: string, name: string, first: number, after: string | null) => `{
  repository(owner: "${owner}", name: "${name}") {
    refs(refPrefix: "refs/tags/", first: ${first}${after ? `, after: "${after}"` : ""}, orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        target {
          ... on Tag {
            tagger { date }
            target {
              ... on Commit {
                oid
                message
                author { name email date }
              }
            }
          }
          ... on Commit {
            oid
            message
            author { name email date }
          }
        }
      }
    }
  }
}`;

interface GraphQLTagNode {
	name: string;
	target: {
		tagger?: { date: string };
		target?: {
			oid: string;
			message: string;
			author: { name: string; email: string; date: string };
		};
		oid?: string;
		message?: string;
		author?: { name: string; email: string; date: string };
	};
}

interface TagsPage {
	tags: GitTag[];
	hasNextPage: boolean;
	endCursor: string | null;
}

function parseTagsFromGraphQL(raw: string): TagsPage {
	const parsed = JSON.parse(raw);
	const refs = parsed?.data?.repository?.refs;
	if (!refs) return { tags: [], hasNextPage: false, endCursor: null };

	const nodes = refs.nodes as GraphQLTagNode[];
	const tags: GitTag[] = nodes.map((node) => {
		const target = node.target;
		const commit = target.target?.oid || target.oid || "";
		const message = target.target?.message || target.message || "";
		const author = target.target?.author || target.author || { name: "", email: "", date: "" };
		const date = target.tagger?.date || author.date || "";

		return { name: node.name, commit, date, message, author };
	});

	return {
		tags,
		hasNextPage: refs.pageInfo.hasNextPage,
		endCursor: refs.pageInfo.endCursor,
	};
}

export function useGitTags({
	repo,
	enabled = true,
}: UseGitTagsOptions) {
	const [owner, name] = repo.split("/");

	const { data, ...rest } = useInfiniteQuery<TagsPage, Error, InfiniteData<TagsPage>, readonly unknown[], string | null>({
		queryKey: queryKeys.git.tags(repo),
		queryFn: async ({ pageParam }) => {
			const cursor = pageParam ?? null;
			const query = TAGS_QUERY(owner, name, PER_PAGE, cursor);
			const response = await runCommand([
				'gh', 'api', 'graphql', '-f', `query=${query}`,
			]);
			return parseTagsFromGraphQL(response.stdout);
		},
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => {
			if (!lastPage.hasNextPage) return undefined;
			return lastPage.endCursor;
		},
		enabled: enabled && !!repo,
		...applyCachePolicy("git"),
		staleTime: Infinity,
	});

	const tags = data?.pages.flatMap((p) => p.tags);
	const latestTag = tags?.[0];

	return { tags, latestTag, ...rest };
}
