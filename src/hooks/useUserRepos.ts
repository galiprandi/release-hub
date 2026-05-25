import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import { quote } from '@/utils/shell'
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
      const commands: string[] = []

      if (org) {
        // If org specified, only list repos from that org
        commands.push(
          `gh repo list ${quote(org)} --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission`
        )
      } else {
        // Get organizations dynamically
        const orgsResult = await runCommand('gh api /user/memberships/orgs --jq \'.[].organization.login\'')
        const orgs = orgsResult.stdout.trim().split('\n').filter(Boolean)

        // Add commands for each org
        orgs.forEach((orgName) => {
          commands.push(
            `gh repo list ${quote(orgName)} --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission`
          )
        })

        // Add user's personal repos
        commands.push(
          'gh repo list --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission'
        )

        // Add additional users
        ADDITIONAL_USERS.forEach((user) => {
          commands.push(
            `gh repo list ${quote(user)} --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission`
          )
        })
      }

      // Execute all commands and combine results with jq
      const combinedCommand = `(${commands.join(' && ')}) | jq -s 'add'`
      const result = await runCommand(combinedCommand)
      const repos = JSON.parse(result.stdout) as CmdResponseDTO[]

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

