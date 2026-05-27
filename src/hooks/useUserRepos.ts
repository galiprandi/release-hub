import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys'

// Type definitions at EOF
interface ParamsDTO {
  org?: string
  enabled?: boolean
}

interface CmdResponseDTO {
  name: string
  fullName: string
  nameWithOwner?: string
  description: string
  pushedAt?: string
  updatedAt?: string
  isPrivate: boolean
  viewerPermission: string
}

// Type for repo data
export interface Repo {
  fullName: string
  name: string
  description: string
  updatedAt: string
  viewerPermission: string
  // Extended fields (optional - fetched on demand)
  latestTag?: string
  latestCommitSha?: string
  latestCommitAuthor?: string
  commitCount?: number
}

interface UseUserReposOptions extends ParamsDTO {
  org?: string
  enabled?: boolean
}

/**
 * Hook to list all repositories for the authenticated user
 * Uses gh CLI on the backend - returns empty array if gh not configured
 */
export function useUserRepos({
  org,
  enabled = true,
}: UseUserReposOptions = {}) {
  // Additional users to include (configurable)
  const ADDITIONAL_USERS = ['galiprandi']

  return useQuery<Repo[]>({
    queryKey: queryKeys.user.repos(org || 'all'),
    queryFn: async () => {
      const repoListArgs = [
        '--limit',
        '1000',
        '--json',
        'name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission',
      ]

      if (org) {
        // If org specified, only list repos from that org
        const result = await runCommand(['gh', 'repo', 'list', org, ...repoListArgs])
        const repos = JSON.parse(result.stdout) as CmdResponseDTO[]
        return repos.map((repo) => ({
          fullName: repo.fullName || repo.nameWithOwner || '',
          name: repo.name,
          description: repo.description || '',
          updatedAt: repo.pushedAt || repo.updatedAt || '',
          viewerPermission: repo.viewerPermission,
        }))
      } else {
        // Get organizations dynamically
        const orgsResult = await runCommand(['gh', 'api', '/user/memberships/orgs', '--jq', '.[].organization.login'])
        const orgs = orgsResult.stdout.trim().split('\n').filter(Boolean)

        const allPromises = [
          // User's personal repos
          runCommand(['gh', 'repo', 'list', ...repoListArgs]),
          // Additional users
          ...ADDITIONAL_USERS.map((user) => runCommand(['gh', 'repo', 'list', user, ...repoListArgs])),
          // Organizations
          ...orgs.map((orgName) => runCommand(['gh', 'repo', 'list', orgName, ...repoListArgs])),
        ]

        const results = await Promise.all(allPromises)
        const allRepos = results.flatMap((res) => JSON.parse(res.stdout || '[]') as CmdResponseDTO[])

        return allRepos.map((repo) => ({
          fullName: repo.fullName || repo.nameWithOwner || '',
          name: repo.name,
          description: repo.description || '',
          updatedAt: repo.pushedAt || repo.updatedAt || '',
          viewerPermission: repo.viewerPermission,
        }))
      }
    },
    select: (data) => {
      // Handle both old format {results: []} and new format []
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'results' in data) {
        return (data as { results: Repo[] }).results;
      }
      return [];
    },
    enabled,
    ...applyCachePolicy("user"),
  })
}

