/**
 * Pulsar Build Adapter
 * Transforma datos de GitHub Actions (workflow pulsar-nx-build.yml) al formato PulsarBuildData.
 * Usa `gh api` via runCommand para fetchar workflows, runs y jobs.
 *
 * Detección: un repo es "Pulsar" si tiene el workflow `.github/workflows/pulsar-nx-build.yml`.
 * Ambiente: tag push (v*.*.*) → production, commit push (main/staging) → staging.
 */
import type {
	PulsarBuildData,
	PulsarBuildsByEnv,
	PulsarFallbackJob,
	PulsarImageJob,
	PulsarStep,
} from './types'
import {
	aggregateRunState,
	findErrorStep,
	inferRefType,
	isImageJob,
	mapGhState,
	mapStepState,
	parseAppName,
} from './utils'
import { runCommand } from '@/api/exec'

const PULSAR_WORKFLOW_PATH = '.github/workflows/pulsar-nx-build.yml'

/** Respuesta de gh api workflows (campos usados) */
interface GhWorkflow {
	id: number
	name: string
	path: string
}

/** Respuesta de gh api runs (campos usados) */
interface GhRun {
	id: number
	head_branch: string
	event: string
	status: string
	conclusion: string | null
	head_sha: string
	display_title: string
	html_url: string
	created_at: string
	updated_at: string
	head_commit?: {
		message?: string
		author?: { name?: string }
	}
}

/** Respuesta de gh api jobs (campos usados) */
interface GhJob {
	id: number
	name: string
	status: string
	conclusion: string | null
	html_url: string
	started_at: string | null
	completed_at: string | null
	steps?: GhStep[]
}

interface GhStep {
	number: number
	name: string
	status: string
	conclusion: string | null
	started_at: string | null
	completed_at: string | null
}

/**
 * Parsea stdout de `gh api ... --jq` que devuelve múltiples objetos JSON (uno por línea).
 */
function parseJsonLines<T>(stdout: string): T[] {
	return stdout
		.trim()
		.split('\n')
		.filter((line) => line.startsWith('{'))
		.map((line) => {
			try {
				return JSON.parse(line) as T
			} catch {
				return null
			}
		})
		.filter((v): v is T => v !== null)
}

/**
 * Mapea un step de GitHub Actions a PulsarStep
 */
function mapStep(step: GhStep): PulsarStep {
	return {
		number: step.number,
		name: step.name,
		state: mapStepState(step.conclusion, step.status),
		startedAt: step.started_at ?? undefined,
		completedAt: step.completed_at ?? undefined,
	}
}

/**
 * Mapea un job de GitHub Actions a PulsarImageJob (si es de imagen)
 */
function mapImageJob(job: GhJob): PulsarImageJob | null {
	const parsed = parseAppName(job.name)
	if (!parsed) return null
	const steps = (job.steps || []).map(mapStep)
	const errorStep = findErrorStep(steps)
	return {
		id: job.id,
		name: job.name,
		app: parsed.app,
		appType: parsed.appType,
		state: mapGhState(job.status, job.conclusion),
		url: job.html_url,
		steps,
		errorStep,
		startedAt: job.started_at ?? undefined,
		completedAt: job.completed_at ?? undefined,
	}
}

/**
 * Mapea un job no-imagen fallido a PulsarFallbackJob
 */
function mapFallbackJob(job: GhJob): PulsarFallbackJob {
	const steps = (job.steps || []).map(mapStep)
	return {
		id: job.id,
		name: job.name,
		state: mapGhState(job.status, job.conclusion),
		url: job.html_url,
		errorStep: findErrorStep(steps),
	}
}

/**
 * Transforma un run + sus jobs a PulsarBuildData
 */
function transformRun(run: GhRun, jobs: GhJob[]): PulsarBuildData {
	const refType = inferRefType(run.head_branch)
	const ref = refType === 'TAG' ? run.head_branch : run.head_sha.slice(0, 7)
	const environment = refType === 'TAG' ? 'production' : 'staging'

	const imageJobs = jobs
		.filter((j) => isImageJob(j.name))
		.map(mapImageJob)
		.filter((j): j is PulsarImageJob => j !== null)

	// Fallback: primer job no-imagen fallido (Validations, Golden Image, etc.)
	const fallbackFailed = jobs.find(
		(j) => !isImageJob(j.name) && mapGhState(j.status, j.conclusion) === 'FAILED'
	)
	const fallbackJob = fallbackFailed ? mapFallbackJob(fallbackFailed) : undefined

	// Estado agregado
	const allImagesSkipped = imageJobs.length > 0 && imageJobs.every((img) => img.state === 'SKIPPED')
	const fallbackState = fallbackJob?.state
	const state = allImagesSkipped
		? (fallbackState ?? 'SKIPPED')
		: aggregateRunState(imageJobs, fallbackState)

	return {
		id: run.id,
		ref,
		refType,
		environment,
		state,
		images: imageJobs,
		fallbackJob,
		externalUrl: run.html_url,
		commit: {
			message: run.head_commit?.message,
			author: run.head_commit?.author?.name,
			sha: run.head_sha,
		},
		startedAt: run.created_at,
		completedAt: run.updated_at,
		updatedAt: run.updated_at,
	}
}

export const pulsarAdapter = {
	/**
	 * Verifica si un repo usa Pulsar (tiene el workflow pulsar-nx-build.yml).
	 * Cacheable: los workflows cambian raramente.
	 */
	async isPulsarRepo(org: string, repo: string): Promise<boolean> {
		try {
			const { stdout } = await runCommand([
				'gh',
				'api',
				`repos/${org}/${repo}/actions/workflows?per_page=100`,
				'--jq',
				'.workflows[] | {id: .id, name: .name, path: .path}',
			])
			const workflows = parseJsonLines<GhWorkflow>(stdout)
			return workflows.some((w) => w.path === PULSAR_WORKFLOW_PATH)
		} catch {
			return false
		}
	},

	/**
	 * Obtiene el ID del workflow pulsar-nx-build.yml
	 */
	async getWorkflowId(org: string, repo: string): Promise<number | null> {
		try {
			const { stdout } = await runCommand([
				'gh',
				'api',
				`repos/${org}/${repo}/actions/workflows?per_page=100`,
				'--jq',
				'.workflows[] | {id: .id, name: .name, path: .path}',
			])
			const workflows = parseJsonLines<GhWorkflow>(stdout)
			const wf = workflows.find((w) => w.path === PULSAR_WORKFLOW_PATH)
			return wf?.id ?? null
		} catch {
			return null
		}
	},

	/**
	 * Fetchea los últimos builds del workflow pulsar-nx-build.yml.
	 * Separa staging (commit push) y production (tag push).
	 * Solo fetchea jobs del run más reciente por ambiente para minimizar API calls.
	 */
	async fetchLatestBuilds(org: string, repo: string): Promise<PulsarBuildsByEnv | null> {
		const workflowId = await this.getWorkflowId(org, repo)
		if (!workflowId) return null

		// Obtener últimos 10 runs del workflow
		const { stdout: runsStdout } = await runCommand([
			'gh',
			'api',
			`repos/${org}/${repo}/actions/workflows/${workflowId}/runs?per_page=10`,
			'--jq',
			'.workflow_runs[] | {id: .id, head_branch: .head_branch, event: .event, status: .status, conclusion: .conclusion, head_sha: .head_sha, display_title: .display_title, html_url: .html_url, created_at: .created_at, updated_at: .updated_at, head_commit: {message: .head_commit.message, author: {name: .head_commit.author.name}}}',
		])
		const runs = parseJsonLines<GhRun>(runsStdout)
		if (runs.length === 0) return { staging: null, production: null }

		// Separar por ambiente: tag → production, commit → staging
		// Tomar el run más reciente de cada tipo
		let stagingRun: GhRun | null = null
		let productionRun: GhRun | null = null
		for (const run of runs) {
			const refType = inferRefType(run.head_branch)
			if (refType === 'TAG') {
				if (!productionRun) productionRun = run
			} else {
				if (!stagingRun) stagingRun = run
			}
			if (stagingRun && productionRun) break
		}

		// Fetchea jobs solo de los runs seleccionados (en paralelo)
		const [stagingJobs, productionJobs] = await Promise.all([
			stagingRun ? this.fetchJobs(org, repo, stagingRun.id) : Promise.resolve([]),
			productionRun ? this.fetchJobs(org, repo, productionRun.id) : Promise.resolve([]),
		])

		return {
			staging: stagingRun ? transformRun(stagingRun, stagingJobs) : null,
			production: productionRun ? transformRun(productionRun, productionJobs) : null,
		}
	},

	/**
	 * Fetchea los jobs de un run específico
	 */
	async fetchJobs(org: string, repo: string, runId: number): Promise<GhJob[]> {
		try {
			const { stdout } = await runCommand([
				'gh',
				'api',
				`repos/${org}/${repo}/actions/runs/${runId}/jobs?per_page=50`,
				'--jq',
				'.jobs[] | {id: .id, name: .name, status: .status, conclusion: .conclusion, html_url: .html_url, started_at: .started_at, completed_at: .completed_at, steps: [.steps[] | {number: .number, name: .name, status: .status, conclusion: .conclusion, started_at: .started_at, completed_at: .completed_at}]}',
			])
			return parseJsonLines<GhJob>(stdout)
		} catch {
			return []
		}
	},
}
