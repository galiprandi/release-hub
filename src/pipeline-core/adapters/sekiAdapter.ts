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
	}
}

/**
 * Flatten Seki events with their subevents
 */
function flattenSekiEvents(events: SekiEvent[]): PipelineEvent[] {
	const result: PipelineEvent[] = []
	
	for (const event of events) {
		// Add parent event
		result.push({
			id: event.id || `event-${event.label?.en || 'unknown'}`,
			name: event.label?.es || event.label?.en || event.id,
			state: mapSekiState(event.state),
			startedAt: event.created_at,
			completedAt: event.updated_at,
		})
		
		// Add subevents if present
		if (event.subevents?.length) {
			for (const sub of event.subevents) {
				result.push(mapSubEvent(sub))
			}
		}
	}
	
	return result
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
		events: flattenSekiEvents(data.events),
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
	
	/**
	 * Fetch pipeline data from Seki.
	 *
	 * WARNING: For `viewMode === 'tags'` the `commit` parameter is **required**
	 * and must be the full 40-character commit hash associated with the tag.
	 * The Seki API endpoint is `/products/:org/:repo/pipelines/:commit/:tag`.
	 * Passing an empty string or omitting `commit` produces a double-slash URL
	 * (`/pipelines//tag`) which returns 404 or no data.
	 *
	 * @param commit - Full commit hash (required when viewMode is 'tags')
	 */
	async fetch(
		org: string,
		repo: string,
		viewMode: ViewMode,
		ref: string,
		commit?: string
	): Promise<PipelineData | null> {
		const fullProduct = `${org}/${repo}`
		
		try {
			let response
			
			if (viewMode === 'tags') {
				// For production, we need a tag (ref should be the tag name)
				// and a commit hash for the Seki API
				if (!ref || ref.length < 5) {
					return null
				}
				if (!commit || commit.length < 7) {
					return null
				}
				response = await fetchPipelineWithTag(fullProduct, commit, ref)
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
