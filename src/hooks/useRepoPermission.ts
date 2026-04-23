import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'

interface UseRepoPermissionOptions {
  repo: string
  enabled?: boolean
}

export interface RepoPermission {
  permissions?: {
    admin: boolean
    maintain: boolean
    push: boolean
    triage: boolean
    pull: boolean
  }
  viewerPermission?: string
  viewerCanAdminister?: boolean
}

/**
 * Hook to get viewer permission for a specific repository
 */
export function useRepoPermission({ repo, enabled = true }: UseRepoPermissionOptions) {
  return useQuery<RepoPermission>({
    queryKey: ['repo', 'permission', repo],
    queryFn: async () => {
      const result = await runCommand(`gh api repos/${repo} --jq '{permissions, viewerPermission, viewerCanAdminister}'`)
      try {
        return JSON.parse(result.stdout || '{}')
      } catch {
        return {}
      }
    },
    enabled: enabled && !!repo,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}
