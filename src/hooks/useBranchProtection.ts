import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import { quote } from '@/utils/shell'
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys'

interface UseBranchProtectionOptions {
	repo: string
	enabled?: boolean
}

export interface BranchProtection {
	url: string
	required_signatures: {
		url: string
		enabled: boolean
	}
	enforce_admins: {
		url: string
		enabled: boolean
	}
	required_linear_history: {
		enabled: boolean
	}
	allow_force_pushes: {
		enabled: boolean
	}
	allow_deletions: {
		enabled: boolean
	}
	block_creations: {
		enabled: boolean
	}
	required_conversation_resolution: {
		enabled: boolean
	}
	lock_branch: {
		enabled: boolean
	}
	allow_fork_syncing: {
		enabled: boolean
	}
}

export interface BranchProtectionStatus {
	isLocked: boolean
	hasProtection: boolean
	canManage: boolean // User has admin permissions
}

/**
 * Hook to get branch protection status for a repository's main branch
 * Returns whether the branch is locked (code freeze), if protection exists,
 * and if the user has admin permissions to manage it
 */
export function useBranchProtection({ repo, enabled = true }: UseBranchProtectionOptions) {
	return useQuery<BranchProtectionStatus>({
		queryKey: queryKeys.repo.branchProtection(repo),
		queryFn: async () => {
			try {
				// Get user permissions via gh API
				const permResult = await runCommand(`gh api ${quote(`repos/${repo}`)} --jq '{permissions, viewerPermission, viewerCanAdminister}'`)
				const permissions = JSON.parse(permResult.stdout || '{}')

				const isAdmin = permissions?.permissions?.admin ||
					permissions?.viewerPermission === 'ADMIN' ||
					permissions?.viewerCanAdminister

				// Assume not locked unless we can verify otherwise
				let isLocked = false
				let hasProtection = false

				// Try to get branch protection status
				try {
					const result = await runCommand(`gh api ${quote(`repos/${repo}/branches/main/protection`)}`)
					const protection = JSON.parse(result.stdout || '{}')
					isLocked = protection.lock_branch?.enabled || false
					hasProtection = true
				} catch {
					// Any error means no branch protection is configured
					isLocked = false
					hasProtection = false
				}

				return {
					isLocked,
					hasProtection,
					canManage: isAdmin || false,
				}
			} catch {
				// If permissions check fails, assume no permissions
				return {
					isLocked: false,
					hasProtection: false,
					canManage: false,
				}
			}
		},
		enabled: enabled && !!repo,
		...applyCachePolicy("repo"),
	})
}

