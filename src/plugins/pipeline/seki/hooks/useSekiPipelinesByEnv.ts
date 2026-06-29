/**
 * useSekiPipelinesByEnv Hook
 * Hook para fetchar pipeline data de Seki para ambos ambientes
 * (staging + production) en una sola llamada.
 * Sin detección de provider: si no hay token, no fetchea.
 */

import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { SekiPipelinesByEnv } from '../adapter'
import { sekiAdapter } from '../adapter'

interface UseSekiPipelinesByEnvOptions {
	org: string
	repo: string
	enabled?: boolean
}

interface UseSekiPipelinesByEnvResult {
	/** Pipeline data for both environments */
	data: SekiPipelinesByEnv | null
	/** Loading states */
	isLoading: boolean
	isFetching: boolean
	/** Error if one occurred */
	error: Error | null
	/** Refetch function */
	refetch: () => void
}

/**
 * Hook para fetching de pipeline data desde Seki por ambiente.
 * Si no hay token, retorna data: null sin fetchar.
 * Smart polling: 15s cuando algún pipeline está activo (STARTED/RUNNING).
 */
export function useSekiPipelinesByEnv({
	org,
	repo,
	enabled = true,
}: UseSekiPipelinesByEnvOptions): UseSekiPipelinesByEnvResult {
	const hasToken = sekiAdapter.hasToken()

	const { data, isLoading, isFetching, error, refetch } = useQuery({
		queryKey: ['seki-pipelines-env', org, repo],
		queryFn: async () => {
			const result = await sekiAdapter.fetchByEnvironment(org, repo)

			if (!result) {
				throw new Error('Pipeline data not found')
			}

			return result
		},
		enabled: enabled && hasToken && !!org && !!repo,
		refetchInterval: (query) => {
			const pipelines = query.state.data as SekiPipelinesByEnv | undefined
			if (!pipelines) return false

			const activeStates = ['STARTED', 'RUNNING']
			const hasActiveStaging = pipelines.staging?.events.some((e) =>
				activeStates.includes(e.state)
			) || activeStates.includes(pipelines.staging?.state ?? '')
			const hasActiveProd = pipelines.production?.events.some((e) =>
				activeStates.includes(e.state)
			) || activeStates.includes(pipelines.production?.state ?? '')

			if (hasActiveStaging || hasActiveProd) {
				return 15000 // 15 seconds
			}

			return false
		},
		staleTime: 5000,
		retry: (failureCount, error) => {
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
		isLoading,
		isFetching,
		error,
		refetch: handleRefetch,
	}
}
