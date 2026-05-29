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
      const getRepos = async (target?: string) => {
        const args = ['gh', 'repo', 'list']
        if (target) args.push(target)
        args.push('--limit', '1000', '--json', 'name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission')
        const res = await runCommand(args)
        return JSON.parse(res.stdout || '[]') as CmdResponseDTO[]
      }

      let repos: CmdResponseDTO[] = []

      if (org) {
        repos = await getRepos(org)
      } else {
        // Get organizations dynamically
        const orgsResult = await runCommand(['gh', 'api', '/user/memberships/orgs', '--jq', '.[].organization.login'])
        const orgs = orgsResult.stdout.trim().split('\n').filter(Boolean)

        const results = await Promise.all([
          // User's personal repos
          getRepos(),
          // Each org's repos
          ...orgs.map(orgName => getRepos(orgName)),
          // Additional users
          ...ADDITIONAL_USERS.map(user => getRepos(user))
        ])

        // Flatten results and remove duplicates by nameWithOwner
        const seen = new Set<string>()
        repos = results.flat().filter(repo => {
          const id = repo.nameWithOwner || repo.fullName
          if (!id || seen.has(id)) return false
          seen.add(id)
          return true
        })
      }

      return (repos || []).map((repo) => ({
        fullName: repo.fullName || repo.nameWithOwner || '',
        name: repo.name,
        description: repo.description || '',
        updatedAt: repo.pushedAt || repo.updatedAt || '',
        viewerPermission: repo.viewerPermission,
      }))
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

