import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'
import type { Event } from '@/api/seki.type'
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys'

interface WorkflowRun {
  id: number
  name: string
  head_sha: string
  head_commit?: {
    author?: {
      name?: string
    }
    message?: string
  }
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null
  created_at: string
  updated_at: string
  html_url: string
  jobs_url?: string
  events?: Event[]
}

export interface WorkflowJob {
  id: number
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null
  started_at: string | null
  completed_at: string | null
}

interface CommitInfo {
  author: string
  message: string
  sha: string
}

interface UseGitHubActionsOptions {
  org: string
  repo: string
  workflowName: string
  enabled?: boolean
}

interface GitHubActionsResult {
  runs: (WorkflowRun & { commitInfo?: CommitInfo })[] | null
  isLoading: boolean
  error: Error | null
}

/**
 * Get commit info for a specific commit
 */
const getCommitInfo = async (org: string, repo: string, sha: string): Promise<CommitInfo> => {
  try {
    const { stdout } = await runCommand([
      'gh',
      'api',
      `repos/${org}/${repo}/commits/${sha}`,
      '--jq',
      '{author: .commit.author.name, message: .commit.message, sha: .sha}'
    ])
    const data = JSON.parse(stdout)
    return {
      author: data.author || 'Unknown',
      message: data.message || '',
      sha: data.sha,
    }
  } catch (error) {
    console.error('Error fetching commit info:', error)
    return {
      author: 'Unknown',
      message: '',
      sha,
    }
  }
}

interface GitHubStep {
	number: number
	name: string
	status: string
	conclusion: string | null
	started_at: string | null
	completed_at: string | null
}

/**
 * Transform WorkflowJob to Event format for MiniTimeline
 */
function transformJobToEvent(job: WorkflowJob & { steps?: GitHubStep[] }): Event {
	const stateMap: Record<string, string> = {
		success: 'SUCCESS',
		failure: 'FAILED',
		cancelled: 'CANCELLED',
		skipped: 'SKIPPED',
		in_progress: 'RUNNING',
		queued: 'PENDING',
	}

	const state = job.status === 'completed' ? stateMap[job.conclusion || 'skipped'] : stateMap[job.status]

	// Remove action name and "/" prefix from job name (e.g., "nx-build / 📋 Validations" → "📋 Validations")
	const cleanName = job.name.replace(/^.*\s*\/\s*/, '')

	// Transform steps to subevents
	const subevents = (job.steps || [])
		.filter((step) => step.name !== cleanName) // Filter out steps with same name as job
		.map((step: GitHubStep) => ({
			id: `${job.id}-${step.number}`,
			label: step.name,
			state: step.status === 'completed' ? (step.conclusion || 'success').toUpperCase() : step.status.toUpperCase(),
			created_at: step.started_at || new Date().toISOString(),
			updated_at: step.completed_at || new Date().toISOString(),
			markdown: step.name,
		}))

	return {
		id: String(job.id),
		label: {
			es: cleanName,
			en: cleanName,
			br: cleanName,
		},
		state,
		created_at: job.started_at || job.completed_at || new Date().toISOString(),
		updated_at: job.completed_at || job.started_at || new Date().toISOString(),
		markdown: '', // Don't show markdown for jobs (only subevents)
		subevents,
	}
}

/**
 * Get jobs for a specific workflow run and transform to Event format
 */
const getWorkflowJobsAsEvents = async (
  org: string,
  repo: string,
  runId: number,
  limit: number = 3
): Promise<Event[]> => {
  try {
    const { stdout } = await runCommand([
      'gh',
      'api',
      `repos/${org}/${repo}/actions/runs/${runId}/jobs`,
      '--jq',
      `.jobs[:${limit}] | map({id, name, status, conclusion, started_at, completed_at, steps})`
    ])
    if (!stdout || stdout.trim() === '' || stdout === 'null') {
      return []
    }
    const jobs: (WorkflowJob & { steps?: GitHubStep[] })[] = JSON.parse(stdout)
    return jobs.map(transformJobToEvent)
  } catch (error) {
    console.error('[GitHub Actions] Error fetching workflow jobs:', error)
    return []
  }
}

/**
 * Get workflow runs for a specific workflow
 */
const getWorkflowRuns = async (
  org: string,
  repo: string,
  workflowName: string,
  limit: number = 5
): Promise<{ workflow_runs: WorkflowRun[] }> => {
  try {
    console.log(`[GitHub Actions] Looking for workflow: ${workflowName} in ${org}/${repo}`)

    // Get workflow ID from workflow name first
    const { stdout: workflowStdout } = await runCommand([
      'gh',
      'api',
      `repos/${org}/${repo}/actions/workflows`,
      '--jq',
      `.workflows[] | select(.name == "${workflowName}") | {id, name}`
    ])
    console.log(`[GitHub Actions] Workflow lookup stdout:`, workflowStdout)

    const workflowData = JSON.parse(workflowStdout)
    console.log(`[GitHub Actions] Parsed workflow data:`, workflowData)

    if (!workflowData || !workflowData.id) {
      console.warn(`[GitHub Actions] Workflow "${workflowName}" not found`)
      return { workflow_runs: [] }
    }

    // Get runs using workflow ID
    console.log(`[GitHub Actions] Fetching runs for workflow ID: ${workflowData.id}`)
    const { stdout } = await runCommand([
      'gh',
      'api',
      `repos/${org}/${repo}/actions/workflows/${workflowData.id}/runs`,
      '-F',
      `per_page=${limit}`,
      '--jq',
      '{workflow_runs: [.workflow_runs[] | {id, name, head_sha, status, conclusion, created_at, updated_at, html_url}]}'
    ])
    console.log(`[GitHub Actions] Runs stdout (raw):`, stdout)
    console.log(`[GitHub Actions] Runs stdout length:`, stdout.length)

    if (!stdout || stdout.trim() === '' || stdout === 'null') {
      console.warn('[GitHub Actions] Empty response from API')
      return { workflow_runs: [] }
    }

    const result = JSON.parse(stdout)
    console.log(`[GitHub Actions] Parsed runs:`, result)
    return result
  } catch (error) {
    console.error('[GitHub Actions] Error fetching workflow runs:', error)
    return { workflow_runs: [] }
  }
}

/**
 * Hook to fetch GitHub Actions workflow runs and enrich with commit info and events
 */
export function useGitHubActions({
  org,
  repo,
  workflowName,
  enabled = true,
}: UseGitHubActionsOptions): GitHubActionsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.githubActions.workflow(org, repo, workflowName),
    queryFn: async () => {
      const response = await getWorkflowRuns(org, repo, workflowName, 5)
      const runs = response.workflow_runs
      if (runs.length > 0) {
        try {
          const [commitInfo, events] = await Promise.all([
            getCommitInfo(org, repo, runs[0].head_sha),
            getWorkflowJobsAsEvents(org, repo, runs[0].id, 3),
          ])
          return runs.map((run, index) => ({
            ...run,
            commitInfo: index === 0 ? commitInfo : undefined,
            events: index === 0 ? events : undefined,
          }))
        } catch (err) {
          console.error('Error fetching commit info or events:', err)
          return runs
        }
      }
      return runs
    },
    enabled: enabled && !!org && !!repo && !!workflowName,
    ...applyCachePolicy("github-actions"),
  })

  return {
    runs: data || null,
    isLoading,
    error: error as Error | null,
  }
}
