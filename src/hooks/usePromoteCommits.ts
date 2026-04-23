import { useInfiniteQuery } from "@tanstack/react-query"
import { runCommand } from "@/api/exec"

export interface PromoteCommit {
  hash: string
  message: string
  date: string
  author: string
}

interface UsePromoteCommitsOptions {
  repo: string
  latestTag?: string
  enabled?: boolean
}

interface GithubCommitResponse {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  author?: {
    login: string
  }
}

export function usePromoteCommits({ repo, latestTag, enabled = true }: UsePromoteCommitsOptions) {
  return useInfiniteQuery<PromoteCommit[]>({
    queryKey: ["git", "promote", repo, latestTag || "initial"],
    queryFn: async ({ pageParam = 0 }) => {
      const page = pageParam as number
      const perPage = 10

      if (latestTag) {
        const result = await runCommand(`gh api repos/${repo}/compare/${latestTag}...main`)
        const data = JSON.parse(result.stdout)
        const allCommits = (data.commits || []) as GithubCommitResponse[]
        
        const sliced = allCommits.slice(page * perPage, (page + 1) * perPage)
        
        return sliced.map((c) => ({
          hash: c.sha,
          message: c.commit.message,
          date: c.commit.author.date,
          author: c.author?.login || c.commit.author.name
        }))
      } else {
        const result = await runCommand(`gh api repos/${repo}/commits?per_page=${perPage}&page=${page + 1}`)
        const data = JSON.parse(result.stdout) as GithubCommitResponse[]
        
        return data.map((c) => ({
          hash: c.sha,
          message: c.commit.message,
          date: c.commit.author.date,
          author: c.author?.login || c.commit.author.name
        }))
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < 10) return undefined
      return allPages.length
    },
    enabled: enabled && !!repo,
    staleTime: 5 * 60 * 1000,
  })
}
