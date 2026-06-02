import { useEffect } from 'react'
import { runCommand } from '@/api/exec'
import axios from 'axios'

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
  interface Document {
    modelContext?: ModelContext
  }
}

export function useWebMCP() {
  useEffect(() => {
    if (typeof document === 'undefined' || !document.modelContext) {
      console.info('WebMCP is not available in this browser. Enable chrome://flags/#enable-webmcp-testing to use it.')
      return
    }

    const modelContext = document.modelContext

    // 1. Search Repositories Tool
    modelContext.registerTool({
      name: 'search_repositories',
      description: 'Search for GitHub repositories within the organization or user scope.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search term for repositories' },
        },
        required: ['query'],
      },
      execute: async ({ query }) => {
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
    })

    // 2. Get Repository Details Tool
    modelContext.registerTool({
      name: 'get_repo_details',
      description: 'Get latest commits, tags, and pipeline status for a specific repository.',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'The full name of the repository (e.g., "org/repo")' },
        },
        required: ['repo'],
      },
      execute: async ({ repo }) => {
        if (typeof repo !== 'string') throw new Error('Repo must be a string');
        try {
          // Get latest commit
          const commitResult = await runCommand([
            'gh',
            'api',
            `repos/${repo}/commits`,
            '-f',
            'per_page=5',
            '--jq',
            '[.[] | {hash: .sha, author: .commit.author.name, message: .commit.message, date: .commit.author.date}]',
          ])
          const commits = JSON.parse(commitResult.stdout)

          // Get latest tag
          const tagResult = await runCommand([
            'gh',
            'api',
            `repos/${repo}/tags`,
            '-f',
            'per_page=1',
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
    })

    // 3. Promote to Production Tool
    modelContext.registerTool({
      name: 'promote_to_production',
      description: 'Create a new release tag to promote the current main branch to production. Requires explicit confirmation from the user.',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'The full name of the repository' },
          tagName: { type: 'string', description: 'The name of the new tag (e.g., "v1.2.3")' },
          tagMessage: { type: 'string', description: 'The description of the release' },
        },
        required: ['repo', 'tagName'],
      },
      execute: async ({ repo, tagName, tagMessage }) => {
        if (typeof repo !== 'string' || typeof tagName !== 'string') {
          throw new Error('Repo and tagName must be strings');
        }
        try {
          // Verify authentication and get token
          const tokenResult = await runCommand(['gh', 'auth', 'token'])
          const token = tokenResult.stdout.trim()
          if (!token) throw new Error('GitHub CLI token not found')

          // Get latest commit on main
          const latestCommitResult = await runCommand(['gh', 'api', `repos/${repo}/commits/main`, '--jq', '.sha'])
          const targetCommit = latestCommitResult.stdout.trim()

          // Create Git Tag Object
          const tagResponse = await axios.post(
            `https://api.github.com/repos/${repo}/git/tags`,
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
            `https://api.github.com/repos/${repo}/git/refs`,
            {
              ref: `refs/tags/${tagName}`,
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
    })

    console.info('WebMCP tools registered successfully.')
  }, [])
}
