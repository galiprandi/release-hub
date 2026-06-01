import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys'
import { useDebounce } from '@galiprandi/react-tools'

export interface FileSearchResult {
  name: string
  path: string
  repository: string
  repositoryFullName: string
  htmlUrl: string
  score: number
}

interface CodeSearchItem {
  name: string
  path: string
  html_url: string
  score: number
  repository: {
    full_name: string
    name: string
  }
}

interface CodeSearchResponse {
  total_count: number
  incomplete_results: boolean
  items: CodeSearchItem[]
}

interface UseFileSearchOptions {
  searchTerm?: string
  enabled?: boolean
}

/**
 * Detect if query is a file search (starts with "file:" or "filename:")
 */
export function isFileSearchQuery(query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  return trimmed.startsWith('file:') || trimmed.startsWith('filename:')
}

/**
 * Extract filename from query like "file:AGENTS.md" or "filename:AGENTS.md"
 */
export function extractFileName(query: string): string {
  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('filename:')) {
    return trimmed.slice('filename:'.length).trim()
  }
  if (lower.startsWith('file:')) {
    return trimmed.slice('file:'.length).trim()
  }
  return trimmed
}

/**
 * Hook to search files across accessible repositories using GitHub Code Search API
 * Only executes when searchTerm is a file query (file: or filename:)
 */
export function useFileSearch({ searchTerm = '', enabled = true }: UseFileSearchOptions = {}) {
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const isFileQuery = isFileSearchQuery(debouncedSearchTerm)
  const fileName = isFileQuery ? extractFileName(debouncedSearchTerm) : ''
  const shouldSearch = isFileQuery && fileName.length >= 2 && enabled

  return useQuery<FileSearchResult[]>({
    queryKey: queryKeys.user.fileSearch(debouncedSearchTerm),
    queryFn: async () => {
      // Get username and orgs for search scope
      const userResult = await runCommand(['gh', 'api', '/user', '--jq', '.login'])
      const username = userResult.stdout.trim()

      const orgsResult = await runCommand([
        'gh', 'api', '/user/orgs', '--jq', '.[].login',
      ])
      const orgs = orgsResult.stdout
        .trim()
        .split('\n')
        .filter(Boolean)

      // Build search query: filename + orgs + user
      const filename = extractFileName(debouncedSearchTerm)
      const scopeParts = orgs.map((org) => `org:${org}`)
      scopeParts.push(`user:${username}`)
      const scopeQuery = scopeParts.join('+')

      const searchQuery = `filename:${encodeURIComponent(filename)}+${scopeQuery}`

      const result = await runCommand([
        'gh',
        'api',
        `search/code?q=${searchQuery}`,
        '--jq',
        '.',
      ])

      const data = JSON.parse(result.stdout) as CodeSearchResponse

      return (data.items || []).map((item) => ({
        name: item.name,
        path: item.path,
        repository: item.repository.name,
        repositoryFullName: item.repository.full_name,
        htmlUrl: item.html_url,
        score: item.score,
      }))
    },
    enabled: shouldSearch,
    ...applyCachePolicy('user'),
  })
}
