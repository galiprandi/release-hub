import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import { quote } from '@/utils/shell'
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys'

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
    queryKey: queryKeys.repo.permission(repo),
    queryFn: async () => {
      const result = await runCommand(`gh api ${quote(`repos/${repo}`)} --jq '{permissions, viewerPermission, viewerCanAdminister}'`)
      try {
        return JSON.parse(result.stdout || '{}')
      } catch {
        return {}
      }
    },
    enabled: enabled && !!repo,
    ...applyCachePolicy("repo"),
  })
}
