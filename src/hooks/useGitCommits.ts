import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
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

const PER_PAGE = 10;

const COMMITS_QUERY = (owner: string, name: string, first: number, after: string | null) => `{
  repository(owner: "${owner}", name: "${name}") {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: ${first}${after ? `, after: "${after}"` : ""}) {
            pageInfo { hasNextPage endCursor }
            nodes {
              oid
              message
              author { name email }
              committedDate
            }
          }
        }
      }
    }
  }
}`;

interface GraphQLCommitNode {
	oid: string;
	message: string;
	author: { name: string; email: string } | null;
	committedDate: string;
}

interface CommitsPage {
	commits: GitCommit[];
	hasNextPage: boolean;
	endCursor: string | null;
}

function parseCommitsFromGraphQL(raw: string): CommitsPage {
	const parsed = JSON.parse(raw);
	const history = parsed?.data?.repository?.defaultBranchRef?.target?.history;
	if (!history) return { commits: [], hasNextPage: false, endCursor: null };

	const nodes = history.nodes as GraphQLCommitNode[];
	const commits: GitCommit[] = nodes.map((node) => {
		const message = node.message || "";
		const [subject, ...bodyParts] = message.split('\n');
		const body = bodyParts.join('\n').trim();
		return {
			hash: node.oid,
			shortHash: node.oid.slice(0, 7),
			author: node.author?.name || "",
			date: node.committedDate,
			subject,
			body,
			message,
		};
	});

	return {
		commits,
		hasNextPage: history.pageInfo.hasNextPage,
		endCursor: history.pageInfo.endCursor,
	};
}

export function useGitCommits({
	repo,
	enabled = true,
}: UseGitCommitsOptions) {
	const [owner, name] = repo.split("/");

	const { data, ...rest } = useInfiniteQuery<CommitsPage, Error, InfiniteData<CommitsPage>, readonly unknown[], string | null>({
		queryKey: queryKeys.git.commits(repo),
		queryFn: async ({ pageParam }) => {
			const cursor = pageParam ?? null;
			const query = COMMITS_QUERY(owner, name, PER_PAGE, cursor);
			const response = await runCommand([
				'gh', 'api', 'graphql', '-f', `query=${query}`,
			]);
			return parseCommitsFromGraphQL(response.stdout);
		},
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => {
			if (!lastPage.hasNextPage) return undefined;
			return lastPage.endCursor;
		},
		enabled: enabled && !!repo,
		...applyCachePolicy("git"),
	});

	const commits = data?.pages.flatMap((p) => p.commits);
	const latestCommit = commits?.[0];

	return { commits, latestCommit, ...rest };
}
