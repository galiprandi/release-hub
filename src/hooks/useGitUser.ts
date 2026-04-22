import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'

interface GitUser {
  name: string | null
  email: string | null
  avatar_url: string | null
}

export function useGitUser() {
  return useQuery<GitUser>({
    queryKey: ['git', 'user'],
    queryFn: async () => {
      // Use gh cli to get user info (remote operation)
      try {
        const userResult = await runCommand('gh api user --jq "{name: .name, email: .email, avatar_url: .avatar_url}"')
        const userData = JSON.parse(userResult.stdout)
        return {
          name: userData.name || userData.login || null,
          email: userData.email || null,
          avatar_url: userData.avatar_url || null,
        }
      } catch (error) {
        console.error('Error getting user info:', error)
        return { name: null, email: null, avatar_url: null }
      }
    },
  })
}
