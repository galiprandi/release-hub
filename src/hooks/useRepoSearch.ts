import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import { quote } from '@/utils/shell'
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys'
import { useDebounce } from '@galiprandi/react-tools'

interface Repo {
  name: string
  nameWithOwner: string
  fullName: string
  description: string | null
  pushedAt: string
  updatedAt: string
}

interface RepoSearchResponse {
  results: Repo[]
  totalCount: number
}

interface GraphQLSearchResponse {
  data: {
    search: {
      repositoryCount: number
      nodes: Array<{
        name: string
        nameWithOwner: string
        description: string | null
        pushedAt: string
      }>
    }
  }
}

interface UseRepoSearchOptions {
  searchTerm?: string
  enabled?: boolean
}

/**
 * Hook to search repositories using GraphQL Search API
 * Uses debounce to avoid excessive API calls
 * Only executes search when searchTerm >= 2 characters
 */
export function useRepoSearch({ searchTerm = '', enabled = true }: UseRepoSearchOptions = {}) {
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const shouldSearch = debouncedSearchTerm.length >= 2 && enabled

  return useQuery<RepoSearchResponse>({
    queryKey: queryKeys.user.repoSearch(debouncedSearchTerm),
    queryFn: async () => {
      // Get username for search query
      const userResult = await runCommand('gh api /user --jq \'.login\'')
      const username = userResult.stdout.trim()

      // Build search query with all orgs and user
      const query = `
        query($searchTerm: String!) {
          search(
            query: $searchTerm,
            type: REPOSITORY,
            first: 100
          ) {
            repositoryCount
            nodes {
              ... on Repository {
                name
                nameWithOwner
                description
                pushedAt
              }
            }
          }
        }
      `

      // Construct search term with orgs and user
      // If searchTerm contains "/" (user/repo format), search without org/user filters
      const searchQuery = debouncedSearchTerm.includes('/')
        ? debouncedSearchTerm
        : `${debouncedSearchTerm} org:Cencosud-Cencommerce org:Cencosud-xlabs user:${username}`

      const command = `gh api graphql -f query=${quote(query.replace(/\n/g, ' '))} -f searchTerm=${quote(searchQuery)}`
      const result = await runCommand(command)
      const data = JSON.parse(result.stdout) as GraphQLSearchResponse

      return {
        results: data.data.search.nodes.map((node) => ({
          name: node.name,
          nameWithOwner: node.nameWithOwner,
          fullName: node.nameWithOwner,
          description: node.description,
          pushedAt: node.pushedAt,
          updatedAt: node.pushedAt,
        })),
        totalCount: data.data.search.repositoryCount,
      }
    },
    enabled: shouldSearch,
    ...applyCachePolicy('user'),
  })
}
