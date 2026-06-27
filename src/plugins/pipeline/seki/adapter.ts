/**
 * Seki Pipeline Adapter
 * Transforma datos de la API Seki al formato SekiPipelineData.
 * Usa el endpoint /pipelines/latest-by-environment que devuelve
 * staging + production en una sola llamada.
 */

import type { SekiPipelineData, SekiPipelineEvent, SekiPipelineState } from './types'
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
		'CANCELLED': 'CANCELLED',
		'CANCELED': 'CANCELLED',
		'WARN': 'WARN',
	}
	return stateMap[state.toUpperCase()] || 'IDLE'
}

/**
 * Convert Seki subevent to SekiPipelineEvent
 */
function mapSubEvent(sub: SubEvent): SekiPipelineEvent {
	return {
		id: sub.id || `sub-${Date.now()}`,
		name: sub.label || sub.id,
		state: mapSekiState(sub.state),
		startedAt: sub.created_at,
		completedAt: sub.updated_at,
		markdown: sub.markdown,
	}
}

/**
 * Flatten Seki events with their subevents
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
 * Extract error markdown from failed pipeline events
 */
function extractErrorMarkdown(events: SekiEvent[]): string | undefined {
	const failedSubevents: string[] = []

	for (const event of events) {
		if (event.subevents?.length) {
			for (const sub of event.subevents) {
				if (sub.state === 'FAIL' || sub.state === 'FAILED') {
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
function transformSekiData(data: PipelineStatusResponse): SekiPipelineData {
	const isTag = data.git.event === 'tag'
	const ref = isTag && data.git.ref ? data.git.ref : data.git.commit.slice(0, 7)
	const state = mapSekiState(data.state)

	return {
		id: `seki-${data.git.commit}`,
		ref,
		refType: isTag ? 'TAG' : 'COMMIT',
		state,
		startedAt: data.created_at,
		completedAt: undefined,
		events: flattenSekiEvents(data.events),
		externalUrl: undefined,
		commit: {
			message: data.git.commit_message,
			author: data.git.commit_author,
		},
		updatedAt: data.updated_at,
		errorMarkdown: state === 'FAILED' ? extractErrorMarkdown(data.events) : undefined,
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
