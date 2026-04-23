import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'

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

// Legacy type for compatibility
interface RepoSearchResponse {
  results: Array<{
    fullName: string
    name: string
    description: string
    updatedAt: string
    viewerPermission: string
  }>
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

  return useQuery<RepoSearchResponse>({
    queryKey: ['user', 'repos', org || 'all'],
    queryFn: async () => {
      const commands: string[] = []

      if (org) {
        // If org specified, only list repos from that org
        commands.push(
          `gh repo list ${org} --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission`
        )
      } else {
        // Get organizations dynamically
        const orgsResult = await runCommand('gh api /user/memberships/orgs --jq \'.[].organization.login\'')
        const orgs = orgsResult.stdout.trim().split('\n').filter(Boolean)

        // Add commands for each org
        orgs.forEach((orgName) => {
          commands.push(
            `gh repo list ${orgName} --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission`
          )
        })

        // Add user's personal repos
        commands.push(
          'gh repo list --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission'
        )

        // Add additional users
        ADDITIONAL_USERS.forEach((user) => {
          commands.push(
            `gh repo list ${user} --limit 1000 --json name,nameWithOwner,description,pushedAt,isPrivate,viewerPermission`
          )
        })
      }

      // Execute all commands and combine results with jq
      const combinedCommand = `(${commands.join(' && ')}) | jq -s 'add'`
      const result = await runCommand(combinedCommand)
      const repos = JSON.parse(result.stdout) as CmdResponseDTO[]

      return {
        results: repos.map((repo) => ({
          fullName: repo.fullName || repo.nameWithOwner || '',
          name: repo.name,
          description: repo.description || '',
          updatedAt: repo.pushedAt || repo.updatedAt || '',
          viewerPermission: repo.viewerPermission,
        })),
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

