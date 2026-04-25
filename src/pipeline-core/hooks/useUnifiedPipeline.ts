/**
 * Unified Pipeline Hook
 * Provides a single interface for fetching pipeline data from any provider
 */

import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { PipelineAdapter, PipelineData, PipelineProvider, ViewMode } from '../types'
import { sekiAdapter } from '../adapters/sekiAdapter'
import { pulsarAdapter } from '../adapters/pulsarAdapter'

// Registry of all available adapters
const adapters: PipelineAdapter[] = [pulsarAdapter, sekiAdapter]

interface UsePipelineDetectionOptions {
	org: string
	repo: string
	enabled?: boolean
}

interface UsePipelineDetectionResult {
	provider: PipelineProvider
	loading: boolean
	error: Error | null
}

/**
 * Detect which pipeline provider is available for a repository
 * Priority: Pulsar > Seki > None
 */
export function usePipelineDetection({
	org,
	repo,
	enabled = true,
}: UsePipelineDetectionOptions): UsePipelineDetectionResult {
	const query = useQuery({
		queryKey: ['pipeline-detection', org, repo],
		queryFn: async () => {
			console.log('[PipelineDetection] Checking', org, repo)
			
			for (const adapter of adapters) {
				console.log(`[PipelineDetection] Checking ${adapter.name}...`)
				try {
					const supported = await adapter.supports(org, repo)
					if (supported) {
						console.log(`[PipelineDetection] ${adapter.name} is supported`)
						return adapter.name
					}
				} catch (error) {
					console.error(`[PipelineDetection] Error checking ${adapter.name}:`, error)
				}
			}
			
			console.log('[PipelineDetection] No supported provider found')
			return null
		},
		enabled: enabled && !!org && !!repo,
		staleTime: 60 * 60 * 1000, // 1 hour - cached for fast switching
		gcTime: 24 * 60 * 60 * 1000, // 24 hours
		retry: 1,
	})

	return {
		provider: query.data ?? null,
		loading: query.isLoading,
		error: query.error as Error | null,
	}
}

interface UseUnifiedPipelineOptions {
	org: string
	repo: string
	viewMode: ViewMode
	/** Commit hash for commits view, tag name for tags view */
	ref: string
	enabled?: boolean
}

interface UseUnifiedPipelineResult {
	/** Pipeline data if available */
	data: PipelineData | null
	/** Which provider is being used */
	provider: PipelineProvider
	/** Loading states */
	isLoading: boolean
	isFetching: boolean
	/** Error if any */
	error: Error | null
	/** Refetch function */
	refetch: () => void
}

/**
 * Unified hook for fetching pipeline data from any provider
 * Automatically detects provider and fetches data with smart polling
 */
export function useUnifiedPipeline({
	org,
	repo,
	viewMode,
	ref,
	enabled = true,
}: UseUnifiedPipelineOptions): UseUnifiedPipelineResult {
	// First detect which provider to use
	const { provider, loading: detecting, error: detectionError } = usePipelineDetection({
		org,
		repo,
		enabled,
	})

	// Get the appropriate adapter
	const adapter = provider ? adapters.find(a => a.name === provider) : null

	// Fetch pipeline data
	const { data, isLoading, isFetching, error, refetch } = useQuery({
		queryKey: ['pipeline', provider, org, repo, viewMode, ref],
		queryFn: async () => {
			if (!adapter) {
				throw new Error('No pipeline adapter available')
			}
			
			console.log(`[UnifiedPipeline] Fetching from ${provider} for ${org}/${repo} (${viewMode})`)
			const result = await adapter.fetch(org, repo, viewMode, ref)
			
			if (!result) {
				throw new Error('Pipeline data not found')
			}
			
			return result
		},
		enabled: enabled && !!provider && !!adapter && !!ref,
		// Smart polling based on pipeline state
		refetchInterval: (query) => {
			const pipelineData = query.state.data as PipelineData | undefined
			if (!pipelineData) return false
			
			const activeStates: PipelineData['state'][] = ['STARTED', 'RUNNING']
			const hasActiveEvents = pipelineData.events.some(e => 
				['STARTED', 'RUNNING'].includes(e.state)
			)
			
			// Poll more frequently when pipeline is active
			if (activeStates.includes(pipelineData.state) || hasActiveEvents) {
				return 15000 // 15 seconds
			}
			
			return false // No polling when idle
		},
		staleTime: 5000, // Keep data fresh for 5s
		retry: (failureCount, error) => {
			// Don't retry on 404s
			if (error instanceof Error && error.message.includes('404')) {
				return false
			}
			return failureCount < 2
		},
	})

	const handleRefetch = useCallback(() => {
		refetch()
	}, [refetch])

	return {
		data: data ?? null,
		provider,
		isLoading: detecting || isLoading,
		isFetching,
		error: detectionError || error,
		refetch: handleRefetch,
	}
}
