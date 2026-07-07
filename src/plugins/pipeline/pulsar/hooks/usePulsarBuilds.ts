/**
 * usePulsarBuilds Hook
 * Hook para fetchar builds de imágenes del workflow pulsar-nx-build.yml.
 * Detecta automáticamente si el repo usa Pulsar.
 * Smart polling: 15s cuando algún run está in_progress.
 */
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { pulsarAdapter } from '../adapter'
import type { PulsarBuildsByEnv } from '../types'

interface UsePulsarBuildsOptions {
	org: string
	repo: string
	enabled?: boolean
}

interface UsePulsarBuildsResult {
	/** Si el repo usa Pulsar (tiene el workflow pulsar-nx-build.yml) */
	isPulsarRepo: boolean
	/** Builds data por ambiente */
	data: PulsarBuildsByEnv | null
	/** Loading states */
	isLoading: boolean
	isFetching: boolean
	/** Error si ocurrió */
	error: Error | null
	/** Refetch function */
	refetch: () => void
}

export function usePulsarBuilds({
	org,
	repo,
	enabled = true,
}: UsePulsarBuildsOptions): UsePulsarBuildsResult {
	// Query 1: detección de Pulsar (cache largo, los workflows cambian raramente)
	const {
		data: isPulsar,
		isLoading: isDetecting,
	} = useQuery<boolean>({
		queryKey: ['pulsar-detection', org, repo],
		queryFn: () => pulsarAdapter.isPulsarRepo(org, repo),
		enabled: enabled && !!org && !!repo,
		staleTime: 5 * 60 * 1000, // 5 min
		gcTime: 10 * 60 * 1000,
		retry: 1,
	})

	// Query 2: builds (solo si es Pulsar repo)
	const {
		data,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useQuery<PulsarBuildsByEnv>({
		queryKey: ['pulsar-builds', org, repo],
		queryFn: async () => {
			const result = await pulsarAdapter.fetchLatestBuilds(org, repo)
			if (!result) {
				throw new Error('Pulsar build data not found')
			}
			return result
		},
		enabled: enabled && !!org && !!repo && isPulsar === true,
		refetchInterval: (query) => {
			const builds = query.state.data as PulsarBuildsByEnv | undefined
			if (!builds) return false
			const hasActive =
				builds.staging?.state === 'RUNNING' || builds.production?.state === 'RUNNING'
			return hasActive ? 15000 : false
		},
		staleTime: 5000,
		retry: (failureCount) => failureCount < 2,
	})

	const handleRefetch = useCallback(() => {
		refetch()
	}, [refetch])

	return {
		isPulsarRepo: isPulsar ?? false,
		data: data ?? null,
		isLoading: isDetecting || (isPulsar === true && isLoading),
		isFetching,
		error: error,
		refetch: handleRefetch,
	}
}
