/**
 * Seki Pipeline Adapter
 * Adapts Seki API data to unified PipelineData interface
 */

import type { PipelineAdapter, PipelineData, PipelineEvent, ViewMode } from '../types'
import type { PipelineStatusResponse, SubEvent, Event as SekiEvent } from '@/api/seki.type'
import { fetchPipeline, fetchPipelineWithTag } from '@/api/seki'
import { hasSekiToken } from '@/utils/sekiToken'

/**
 * Map Seki state to unified PipelineState
 */
function mapSekiState(state: string): PipelineData['state'] {
	const stateMap: Record<string, PipelineData['state']> = {
		'IDLE': 'IDLE',
		'STARTED': 'STARTED',
		'RUNNING': 'RUNNING',
		'COMPLETED': 'COMPLETED',
		'SUCCESS': 'COMPLETED',
		'FAILED': 'FAILED',
		'CANCELLED': 'CANCELLED',
		'CANCELED': 'CANCELLED',
	}
	return stateMap[state.toUpperCase()] || 'IDLE'
}

/**
 * Convert Seki subevent to unified PipelineEvent
 */
function mapSubEvent(sub: SubEvent): PipelineEvent {
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
 * Convert Seki events to unified PipelineEvents (with nested subevents)
 */
function mapSekiEvents(events: SekiEvent[]): PipelineEvent[] {
	return events.map(event => ({
		id: event.id || `event-${event.label?.en || 'unknown'}`,
		name: event.label?.es || event.label?.en || event.id,
		state: mapSekiState(event.state),
		startedAt: event.created_at,
		completedAt: event.updated_at,
		markdown: event.markdown,
		subevents: event.subevents?.map(mapSubEvent)
	}))
}

/**
 * Transform Seki response to unified PipelineData
 */
function transformSekiData(data: PipelineStatusResponse, viewMode: ViewMode): PipelineData {
	const isTags = viewMode === 'tags'
	const ref = isTags && data.git.ref ? data.git.ref : data.git.commit.slice(0, 7)
	
	return {
		id: `seki-${data.git.commit}`,
		provider: 'seki',
		ref,
		refType: isTags && data.git.ref ? 'TAG' : 'COMMIT',
		state: mapSekiState(data.state),
		startedAt: data.created_at,
		completedAt: undefined,
		events: mapSekiEvents(data.events),
		externalUrl: undefined, // Seki doesn't provide external URL yet
		commit: {
			message: data.git.commit_message,
			author: data.git.commit_author,
		},
		updatedAt: data.updated_at,
	}
}

export const sekiAdapter: PipelineAdapter = {
	name: 'seki',
	
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async supports(_org: string, _repo: string): Promise<boolean> {
		// Seki is supported if user has a token
		// The backend will validate the scope, so we don't need to validate here
		return hasSekiToken()
	},
	
	async fetch(
		org: string,
		repo: string,
		viewMode: ViewMode,
		ref: string
	): Promise<PipelineData | null> {
		const fullProduct = `${org}/${repo}`
		
		try {
			let response
			
			if (viewMode === 'tags') {
				// For production, we need a tag (ref should be the tag name)
				// Note: This adapter is not used by the old system that uses fetchPipelineWithTag
				// The old system uses usePipelineWithTag directly
				if (!ref || ref.length < 5) {
					return null
				}
				// For the unified system, we would need to pass the commit separately
				// This is a limitation of the current unified adapter design
				response = await fetchPipelineWithTag(fullProduct, '', ref)
			} else {
				// For commits view, we need a commit hash
				if (!ref || ref.length < 7) {
					return null
				}
				response = await fetchPipeline(fullProduct, ref)
			}
			
			// Transform the response to unified format
			return transformSekiData(response.data, viewMode)
		} catch (error) {
			console.error('[SekiAdapter] Error fetching pipeline:', error)
			return null
		}
	}
}
