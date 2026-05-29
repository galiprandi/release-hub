import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys'

interface OrgSummary {
  login: string
  count: number
}

interface UserReposSummary {
  orgs: OrgSummary[]
  personal: number
  total: number
}

interface GraphQLResponse {
  data: {
    viewer: {
      repositories: {
        totalCount: number
      }
      organizations: {
        nodes: Array<{
          login: string
          repositories: {
            totalCount: number
          }
        }>
      }
    }
  }
}

/**
 * Hook to get summary of user's repositories (counts only)
 * Uses GraphQL to fetch totalCount without loading individual repo data
 * Much faster than loading all repos: ~1s vs 47s
 */
export function useUserReposSummary(enabled = true) {
  return useQuery<UserReposSummary>({
    queryKey: queryKeys.user.reposSummary(),
    queryFn: async () => {
      const query = `
        query {
          viewer {
            repositories {
              totalCount
            }
            organizations(first: 100) {
              nodes {
                login
                repositories {
                  totalCount
                }
              }
            }
          }
        }
      `

      const result = await runCommand([
        'gh',
        'api',
        'graphql',
        '-f',
        `query=${query.replace(/\n/g, ' ')}`
      ])
      const data = JSON.parse(result.stdout) as GraphQLResponse

      const orgs = data.data.viewer.organizations.nodes.map((org) => ({
        login: org.login,
        count: org.repositories.totalCount,
      }))

      const personal = data.data.viewer.repositories.totalCount
      const total = personal + orgs.reduce((sum, org) => sum + org.count, 0)

      return {
        orgs,
        personal,
        total,
      }
    },
    enabled,
    ...applyCachePolicy('user'),
  })
}
