/**
 * Pulsar Build Utils
 * Funciones de parsing y status para el módulo Pulsar.
 */

import type { PulsarBuildState, PulsarImageJob, PulsarRefType, PulsarStep } from './types'

/** Regex para detectar tags semver (v1.2.3, v1.0.0-rc.1) */
const TAG_REGEX = /^v\d+\.\d+\.\d+/

/** Regex para extraer app name y type del nombre del job */
const APP_NAME_REGEX = /Build and Push Application \(([^)]+)\)/

/**
 * Determina si un branch name es un tag (producción)
 */
export function isTagBranch(branch: string): boolean {
	return TAG_REGEX.test(branch)
}

/**
 * Determina el refType desde el head_branch del run
 */
export function inferRefType(headBranch: string): PulsarRefType {
	return isTagBranch(headBranch) ? 'TAG' : 'COMMIT'
}

/**
 * Extrae app name y app type del nombre del job.
 * Ej: "nx-build / 📦 Build and Push Application (ai-workflow.nodejs)"
 *   → { app: 'ai-workflow', appType: 'nodejs' }
 */
export function parseAppName(jobName: string): { app: string; appType: string } | null {
	const match = jobName.match(APP_NAME_REGEX)
	if (!match) return null
	const full = match[1]
	const dotIndex = full.lastIndexOf('.')
	if (dotIndex === -1) return { app: full, appType: 'unknown' }
	return {
		app: full.slice(0, dotIndex),
		appType: full.slice(dotIndex + 1),
	}
}

/**
 * Verifica si un job es de "Build and Push Application"
 */
export function isImageJob(jobName: string): boolean {
	return APP_NAME_REGEX.test(jobName)
}

/**
 * Mapea status/conclusion de GitHub Actions a PulsarBuildState
 */
export function mapGhState(status: string, conclusion: string | null): PulsarBuildState {
	if (status === 'in_progress' || status === 'queued') return 'RUNNING'
	if (status === 'completed') {
		switch (conclusion) {
			case 'success':
				return 'COMPLETED'
			case 'failure':
				return 'FAILED'
			case 'cancelled':
				return 'CANCELLED'
			case 'skipped':
				return 'SKIPPED'
			case 'neutral':
				return 'IDLE'
			default:
				return 'IDLE'
		}
	}
	return 'IDLE'
}

/**
 * Mapea el estado de un step individual
 */
export function mapStepState(conclusion: string | null, status: string): PulsarBuildState {
	if (status === 'in_progress') return 'RUNNING'
	return mapGhState(status, conclusion)
}

/**
 * Extrae el primer step fallido de un job
 */
export function findErrorStep(steps: PulsarStep[]): PulsarStep | undefined {
	return steps.find((s) => s.state === 'FAILED')
}

/**
 * Calcula el estado agregado de un run basado en sus imágenes.
 * Si hay imágenes: FAILED si alguna falló, RUNNING si alguna está corriendo, sino COMPLETED.
 * Si no hay imágenes: usa el estado del fallbackJob.
 */
export function aggregateRunState(
	images: PulsarImageJob[],
	fallbackState?: PulsarBuildState
): PulsarBuildState {
	if (images.length === 0) {
		return fallbackState ?? 'IDLE'
	}
	const hasFail = images.some((img) => img.state === 'FAILED')
	const hasRunning = images.some((img) => img.state === 'RUNNING')
	if (hasFail) return 'FAILED'
	if (hasRunning) return 'RUNNING'
	if (images.every((img) => img.state === 'SKIPPED')) {
		return fallbackState ?? 'SKIPPED'
	}
	return 'COMPLETED'
}

/**
 * Formatea duración entre dos timestamps ISO
 */
export function formatDuration(start?: string, end?: string): string | undefined {
	if (!start) return undefined
	const startDate = new Date(start)
	const endDate = end ? new Date(end) : new Date()
	const diffMs = endDate.getTime() - startDate.getTime()
	if (diffMs < 0) return undefined
	const diffSecs = Math.floor(diffMs / 1000)
	const mins = Math.floor(diffSecs / 60)
	const secs = diffSecs % 60
	if (mins > 0) return `${mins}m ${secs}s`
	return `${secs}s`
}
