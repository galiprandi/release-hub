/**
 * Seki Pipeline Adapter
 * Transforma datos de la API Seki al formato SekiPipelineData.
 * Usa el endpoint /pipelines/latest-by-environment que devuelve
 * staging + production en una sola llamada.
 */

import type { SekiPipelineData, SekiPipelineEvent, SekiPipelineState, SekiStage } from './types'
import type { PipelineStatusResponse, SubEvent, Event as SekiEvent } from '@/api/seki.type'
import { fetchPipelinesByEnvironment } from '@/api/seki'
import { hasSekiToken } from '@/utils/sekiToken'

/**
 * Map Seki state to SekiPipelineState
 */
function mapSekiState(state: string): SekiPipelineState {
	const stateMap: Record<string, SekiPipelineState> = {
		'IDLE': 'IDLE',
		'STARTED': 'STARTED',
		'RUNNING': 'RUNNING',
		'COMPLETED': 'COMPLETED',
		'SUCCESS': 'COMPLETED',
		'FAILED': 'FAILED',
		'FAIL': 'FAILED',
		'CANCELLED': 'CANCELLED',
		'CANCELED': 'CANCELLED',
		'WARN': 'WARN',
	}
	return stateMap[state.toUpperCase()] || 'IDLE'
}

const ROUTE_REGEX = /(https?:\/\/[^\s<>"')]+)/gi

/**
 * Limpia una URL extraída de markdown
 */
function cleanUrl(url: string): string {
	return url
		.replace(/<\/[^>]+>$/g, '')
		.replace(/<[^>]+>$/g, '')
		.replace(/"$/, '')
}

/**
 * Verifica si una URL es externa (accesible desde el navegador)
 */
function isExternalUrl(url: string): boolean {
	try {
		const urlObj = new URL(url)
		const hostname = urlObj.hostname
		if (hostname.includes('.svc.cluster.local')) return false
		if (hostname.includes('.svc.') || hostname.endsWith('.local')) return false
		return true
	} catch {
		return false
	}
}

/**
 * Extrae la primera URL externa del markdown de un subevent
 */
function extractDeployUrl(markdown?: string): string | undefined {
	if (!markdown) return undefined
	const matches = markdown.match(ROUTE_REGEX)
	if (!matches) return undefined
	for (const match of matches) {
		const url = cleanUrl(match)
		if (isExternalUrl(url)) return url
	}
	return undefined
}

/**
 * Convert Seki subevent to SekiPipelineEvent
 */
function mapSubEvent(sub: SubEvent): SekiPipelineEvent {
	return {
		id: sub.id || `sub-${Date.now()}`,
		name: sub.label || sub.id,
		label: sub.label || sub.id,
		state: mapSekiState(sub.state),
		startedAt: sub.created_at,
		completedAt: sub.updated_at,
		markdown: sub.markdown,
		deployUrl: extractDeployUrl(sub.markdown),
	}
}

/**
 * Flatten Seki events with their subevents (legacy, for backward compat)
 */
function flattenSekiEvents(events: SekiEvent[]): SekiPipelineEvent[] {
	const result: SekiPipelineEvent[] = []

	for (const event of events) {
		result.push({
			id: event.id || `event-${event.label?.en || 'unknown'}`,
			name: event.label?.es || event.label?.en || event.id,
			state: mapSekiState(event.state),
			startedAt: event.created_at,
			completedAt: event.updated_at,
			markdown: event.markdown,
		})

		if (event.subevents?.length) {
			for (const sub of event.subevents) {
				result.push(mapSubEvent(sub))
			}
		}
	}

	return result
}

/**
 * Build stages from Seki events (preserving event → subevent hierarchy).
 * Each top-level event becomes a stage with its subevents.
 */
function buildStages(events: SekiEvent[]): SekiStage[] {
	return events.map((event) => {
		const subevents: SekiPipelineEvent[] = (event.subevents || []).map(mapSubEvent)
		const eventState = mapSekiState(event.state)

		// Usar el estado del event de Seki como fuente primaria.
		// Solo refinar con subevents si el event está COMPLETED (puede haber
		// subevents FAILED/WARN que el event-level no reflejó).
		const hasFail = subevents.some((s) => s.state === 'FAILED')
		const hasWarn = subevents.some((s) => s.state === 'WARN')
		const hasRunning = subevents.some((s) => s.state === 'RUNNING' || s.state === 'STARTED')
		const allIdle = subevents.length > 0 && subevents.every((s) => s.state === 'IDLE')

		let stageState: SekiPipelineState
		if (eventState === 'STARTED' || eventState === 'RUNNING') {
			stageState = 'RUNNING'
		} else if (eventState === 'IDLE' || allIdle) {
			stageState = 'IDLE'
		} else if (hasFail) {
			stageState = 'FAILED'
		} else if (hasRunning) {
			stageState = 'RUNNING'
		} else if (hasWarn) {
			stageState = 'WARN'
		} else {
			stageState = eventState
		}

		return {
			id: event.id || `stage-${event.label?.en || 'unknown'}`,
			label: event.label?.es || event.label?.en || event.id,
			state: stageState,
			startedAt: event.created_at,
			completedAt: event.updated_at,
			subevents,
		}
	})
}

/**
 * Extract error markdown from failed/warn pipeline events
 */
function extractErrorMarkdown(events: SekiEvent[]): string | undefined {
	const failedSubevents: string[] = []

	for (const event of events) {
		if (event.subevents?.length) {
			for (const sub of event.subevents) {
				const subState = mapSekiState(sub.state)
				if (subState === 'FAILED' || subState === 'WARN') {
					if (sub.markdown) {
						failedSubevents.push(sub.markdown)
					}
				}
			}
		}
	}

	return failedSubevents.length > 0 ? failedSubevents.join('\n\n---\n\n') : undefined
}

/**
 * Transform a single environment's Seki response to SekiPipelineData.
 * The refType is inferred from git.event: 'tag' → TAG, anything else → COMMIT.
 */
export function transformSekiData(data: PipelineStatusResponse): SekiPipelineData {
	const isTag = data.git.event === 'tag'
	const ref = isTag && data.git.ref ? data.git.ref : data.git.commit.slice(0, 7)
	const state = mapSekiState(data.state)

	// completedAt: usar el updated_at del último evento si hay events
	let completedAt: string | undefined
	if (data.events?.length > 0) {
		const lastEvent = data.events[data.events.length - 1]
		completedAt = lastEvent.updated_at
	}

	return {
		id: `seki-${data.git.commit}`,
		ref,
		refType: isTag ? 'TAG' : 'COMMIT',
		state,
		startedAt: data.created_at,
		completedAt,
		events: flattenSekiEvents(data.events),
		stages: buildStages(data.events),
		externalUrl: undefined,
		commit: {
			message: data.git.commit_message,
			author: data.git.commit_author,
		},
		updatedAt: data.updated_at,
		errorMarkdown: extractErrorMarkdown(data.events),
	}
}

export interface SekiPipelinesByEnv {
	staging: SekiPipelineData | null
	production: SekiPipelineData | null
}

export const sekiAdapter = {
	/**
	 * Verifica si Seki está disponible (requiere token válido en localStorage).
	 */
	hasToken(): boolean {
		return hasSekiToken()
	},

	/**
	 * Fetch latest pipeline data for both environments (staging + production)
	 * using the /pipelines/latest-by-environment endpoint.
	 * Does not require a specific commit or tag.
	 */
	async fetchByEnvironment(
		org: string,
		repo: string
	): Promise<SekiPipelinesByEnv | null> {
		const fullProduct = `${org}/${repo}`

		try {
			const response = await fetchPipelinesByEnvironment(fullProduct)
			const data = response.data

			return {
				staging: data.staging ? transformSekiData(data.staging) : null,
				production: data.production ? transformSekiData(data.production) : null,
			}
		} catch (error) {
			console.error('[SekiAdapter] Error fetching pipelines by environment:', error)
			return null
		}
	},
}
