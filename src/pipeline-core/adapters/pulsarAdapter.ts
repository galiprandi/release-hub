/**
 * Pulsar (GitHub Actions) Pipeline Adapter
 * Adapts GitHub Actions workflow data to unified PipelineData interface
 */

import type { PipelineAdapter, PipelineData, PipelineEvent, ViewMode } from '../types'
import { runCommand } from '@/api/exec'

interface WorkflowRun {
	id: number
	name: string
	head_sha: string
	status: 'queued' | 'in_progress' | 'completed'
	conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null
	created_at: string
	updated_at: string
	html_url: string
}

interface WorkflowJob {
	id: number
	name: string
	status: 'queued' | 'in_progress' | 'completed'
	conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null
	started_at: string | null
	completed_at: string | null
}

/**
 * Map GitHub Actions status/conclusion to unified PipelineState
 */
function mapGitHubState(status: string, conclusion: string | null): PipelineData['state'] {
	if (status === 'queued') return 'IDLE'
	if (status === 'in_progress') return 'RUNNING'
	if (status === 'completed') {
		if (conclusion === 'success') return 'COMPLETED'
		if (conclusion === 'failure') return 'FAILED'
		if (conclusion === 'cancelled') return 'CANCELLED'
		if (conclusion === 'skipped') return 'IDLE'
		return 'FAILED'
	}
	return 'IDLE'
}

/**
 * Get workflow runs for a specific workflow
 */
async function getWorkflowRuns(
	org: string,
	repo: string,
	workflowName: string,
	limit: number = 1
): Promise<WorkflowRun[]> {
	try {
		// Get workflow ID from workflow name first
		const { stdout: workflowStdout } = await runCommand(
			`gh api repos/${org}/${repo}/actions/workflows --jq '.workflows[] | select(.name == "${workflowName}") | .id'`
		)

		const workflowId = workflowStdout.trim()
		if (!workflowId) {
			console.warn(`[PulsarAdapter] Workflow "${workflowName}" not found`)
			return []
		}

		// Get runs using workflow ID
		const { stdout } = await runCommand(
			`gh api "repos/${org}/${repo}/actions/workflows/${workflowId}/runs?per_page=${limit}" --jq '.workflow_runs[] | {id, name, head_sha, status, conclusion, created_at, updated_at, html_url}'`
		)

		if (!stdout || stdout.trim() === '') {
			return []
		}

		// Parse each line as a separate JSON object
		const lines = stdout.trim().split('\n').filter(line => line.trim())
		return lines.map(line => JSON.parse(line))
	} catch (error) {
		console.error('[PulsarAdapter] Error fetching workflow runs:', error)
		return []
	}
}

/**
 * Get jobs for a workflow run
 */
async function getWorkflowJobs(
	org: string,
	repo: string,
	runId: number
): Promise<WorkflowJob[]> {
	try {
		const { stdout } = await runCommand(
			`gh api "repos/${org}/${repo}/actions/runs/${runId}/jobs" --jq '.jobs[] | {id, name, status, conclusion, started_at, completed_at}'`
		)

		if (!stdout || stdout.trim() === '') {
			return []
		}

		const lines = stdout.trim().split('\n').filter(line => line.trim())
		return lines.map(line => JSON.parse(line))
	} catch (error) {
		console.error('[PulsarAdapter] Error fetching workflow jobs:', error)
		return []
	}
}

/**
 * Get commit info for a specific SHA
 */
async function getCommitInfo(
	org: string,
	repo: string,
	sha: string
): Promise<{ message?: string; author?: string }> {
	try {
		const { stdout } = await runCommand(
			`gh api repos/${org}/${repo}/git/commits/${sha} --jq '{message: .message, author: .author.name}'`
		)
		return JSON.parse(stdout)
	} catch (error) {
		console.error('[PulsarAdapter] Error fetching commit info:', error)
		return {}
	}
}

/**
 * Transform GitHub Actions data to unified PipelineData
 */
async function transformGitHubData(
	run: WorkflowRun,
	jobs: WorkflowJob[],
	commit: { message?: string; author?: string }
): Promise<PipelineData> {
	const events: PipelineEvent[] = jobs.map(job => ({
		id: `job-${job.id}`,
		name: job.name,
		state: mapGitHubState(job.status, job.conclusion),
		startedAt: job.started_at || undefined,
		completedAt: job.completed_at || undefined,
	}))

	return {
		id: `gha-${run.id}`,
		provider: 'pulsar',
		ref: run.head_sha.slice(0, 7),
		refType: 'COMMIT',
		state: mapGitHubState(run.status, run.conclusion),
		startedAt: run.created_at,
		completedAt: run.updated_at,
		events,
		externalUrl: run.html_url,
		commit: {
			message: commit.message,
			author: commit.author,
		},
		updatedAt: run.updated_at,
	}
}

export const pulsarAdapter: PipelineAdapter = {
	name: 'pulsar',

	async supports(org: string, repo: string): Promise<boolean> {
		try {
			 
			const { stdout } = await runCommand(
				`gh api repos/${org}/${repo}/actions/workflows --jq '.workflows[].name'`
			)
			const workflows = stdout.trim().split('\n')
			return workflows.some((w) => w === 'Nx Build' || w === 'nx-build')
		} catch (error) {
			console.error('[PulsarAdapter] Error checking support:', error)
			return false
		}
	},

	/**
	 * Fetch pipeline data for a specific repository and stage
	 */
	async fetch(
		org: string,
		repo: string,
		viewMode: ViewMode,
		/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
		_ref: string
	): Promise<PipelineData | null> {
		// viewMode is not used - Pulsar always shows latest workflow run
		// _ref is defined by interface but not used in GitHub Actions fetch
		void viewMode
		
		try {
			const runs = await getWorkflowRuns(org, repo, 'Nx Build', 1)
			if (runs.length === 0) return null

			const run = runs[0]
			const [jobs, commit] = await Promise.all([
				getWorkflowJobs(org, repo, run.id),
				getCommitInfo(org, repo, run.head_sha),
			])

			return transformGitHubData(run, jobs, commit)
		} catch (error) {
			console.error('[PulsarAdapter] Error fetching pipeline:', error)
			return null
		}
	}
}
