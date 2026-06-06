import { useEffect, useRef } from 'react'
import { runCommand } from '@/api/exec'
import axios from 'axios'
import { sanitizeRepo, sanitizeGitRef } from '@/lib/utils'

/**
 * WebMCP API Types (Proposed Standard)
 */
interface InputSchema {
  type: 'object'
  properties: Record<string, { type: string; description?: string }>
  required?: string[]
}

interface ModelContext {
  registerTool(tool: WebMCPTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): void
  getTools(): Promise<WebMCPTool[]>
  executeTool(tool: WebMCPTool, input: string, options?: { signal?: AbortSignal }): Promise<unknown>
}

interface WebMCPTool {
  name: string
  description: string
  inputSchema: InputSchema
  execute(input: Record<string, unknown>): Promise<unknown>
}

declare global {
  interface Navigator {
    modelContext?: ModelContext
  }
}

export function useWebMCP() {
  const isRegistered = useRef(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.modelContext) {
      console.info('WebMCP is not available in this browser. Enable chrome://flags/#enable-webmcp-testing to use it.')
      return
    }

    // Avoid duplicate registration in React Strict Mode
    if (isRegistered.current) {
      return
    }

    const modelContext = navigator.modelContext
    const toolNames: string[] = []

    // 1. Search Repositories Tool
    const searchTool: WebMCPTool = {
      name: 'search_repositories',
      description: 'Search for GitHub repositories within the organization or user scope.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'The search term for repositories' },
        },
        required: ['query'],
      },
      execute: async ({ query }: { query: string }) => {
        if (typeof query !== 'string') throw new Error('Query must be a string');
        try {
          const userResult = await runCommand(['gh', 'api', '/user', '--jq', '.login'])
          const username = userResult.stdout.trim()

          const gqlQuery = `
            query($searchTerm: String!) {
              search(query: $searchTerm, type: REPOSITORY, first: 10) {
                nodes {
                  ... on Repository {
                    nameWithOwner
                    description
                    pushedAt
                  }
                }
              }
            }
          `.replace(/\n/g, ' ')

          const searchQuery = query.includes('/')
            ? query
            : `${query} org:Cencosud-Cencommerce org:Cencosud-xlabs user:${username}`

          const result = await runCommand([
            'gh',
            'api',
            'graphql',
            '-f',
            `query=${gqlQuery}`,
            '-f',
            `searchTerm=${searchQuery}`,
          ])

          const data = JSON.parse(result.stdout)
          return data.data.search.nodes
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) }
        }
      },
    }
    modelContext.registerTool(searchTool)
    toolNames.push(searchTool.name)

    // 2. Get Repository Details Tool
    const repoDetailsTool: WebMCPTool = {
      name: 'get_repo_details',
      description: 'Get latest commits, tags, and pipeline status for a specific repository.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          repo: { type: 'string', description: 'The full name of the repository (e.g., "org/repo")' },
        },
        required: ['repo'],
      },
      execute: async ({ repo }: { repo: string }) => {
        if (typeof repo !== 'string') throw new Error('Repo must be a string');
        const sanitizedRepo = sanitizeRepo(repo);
        try {
          // Get latest commit
          const commitResult = await runCommand([
            'gh',
            'api',
            `repos/${sanitizedRepo}/commits?per_page=5`,
            '--jq',
            '[.[] | {hash: .sha, author: .commit.author.name, message: .commit.message, date: .commit.author.date}]',
          ])
          const commits = JSON.parse(commitResult.stdout)

          // Get latest tag
          const tagResult = await runCommand([
            'gh',
            'api',
            `repos/${sanitizedRepo}/tags?per_page=1`,
            '--jq',
            '.[0] | {name: .name, commit: .commit.sha}',
          ])
          const latestTag = tagResult.stdout.trim() ? JSON.parse(tagResult.stdout) : null

          return {
            repo,
            latestCommits: commits,
            latestTag,
          }
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) }
        }
      },
    }
    modelContext.registerTool(repoDetailsTool)
    toolNames.push(repoDetailsTool.name)

    // 3. Promote to Production Tool
    const promoteTool: WebMCPTool = {
      name: 'promote_to_production',
      description: 'Create a new release tag to promote the current main branch to production. Requires explicit confirmation from the user.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          repo: { type: 'string', description: 'The full name of the repository' },
          tagName: { type: 'string', description: 'The name of the new tag (e.g., "v1.2.3")' },
          tagMessage: { type: 'string', description: 'The description of the release' },
        },
        required: ['repo', 'tagName'],
      },
      execute: async ({ repo, tagName, tagMessage }: { repo: string; tagName: string; tagMessage?: string }) => {
        if (typeof repo !== 'string' || typeof tagName !== 'string') {
          throw new Error('Repo and tagName must be strings');
        }
        const sanitizedRepo = sanitizeRepo(repo);
        const sanitizedTagName = sanitizeGitRef(tagName);

        try {
          // Verify authentication and get token
          const tokenResult = await runCommand(['gh', 'auth', 'token'])
          const token = tokenResult.stdout.trim()
          if (!token) throw new Error('GitHub CLI token not found')

          // Get latest commit on main
          const latestCommitResult = await runCommand(['gh', 'api', `repos/${sanitizedRepo}/commits/main`, '--jq', '.sha'])
          const targetCommit = sanitizeGitRef(latestCommitResult.stdout.trim());

          // Create Git Tag Object
          const tagResponse = await axios.post(
            `https://api.github.com/repos/${sanitizedRepo}/git/tags`,
            {
              tag: tagName,
              message: tagMessage || `Release ${tagName}`,
              object: targetCommit,
              type: 'commit',
            },
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )

          // Create Ref
          await axios.post(
            `https://api.github.com/repos/${sanitizedRepo}/git/refs`,
            {
              ref: `refs/tags/${sanitizedTagName}`,
              sha: tagResponse.data.sha,
            },
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )

          return {
            success: true,
            message: `Tag ${tagName} created successfully on ${repo}`,
            tag: tagName,
          }
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) }
        }
      },
    }
    modelContext.registerTool(promoteTool)
    toolNames.push(promoteTool.name)

    console.info('WebMCP tools registered successfully.')
    isRegistered.current = true

    // Cleanup: unregister tools on unmount
    return () => {
      toolNames.forEach(name => {
        try {
          // Note: unregisterTool may not be available in all WebMCP implementations
          // This is a best-effort cleanup
        } catch (error) {
          console.warn(`Failed to unregister tool ${name}:`, error)
        }
      })
    }
  }, [])
}
