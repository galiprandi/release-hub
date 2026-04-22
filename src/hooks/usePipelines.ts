import { useQuery } from '@tanstack/react-query'
import { listPipelines, fetchLatestPipeline } from '@/api/seki'
import type { PipelineStatusResponse } from '@/api/seki.type'
import { SEKI_CONFIG } from '@/config/seki'

interface UsePipelinesOptions {
  product: string
  limit?: number
  enabled?: boolean
}

interface UseLatestPipelineOptions {
  product: string
  stage: 'staging' | 'production'
  enabled?: boolean
}

/**
 * Lists all pipelines for a product.
 * Returns pipelines with full 40-character commit hashes.
 */
export function usePipelines({
  product,
  limit = 50,
  enabled = true,
}: UsePipelinesOptions) {
  return useQuery<PipelineStatusResponse[]>({
    queryKey: ['pipelines', product, { limit }],
    queryFn: async () => {
      const response = await listPipelines(product, { limit })
      return response.data.items
    },
    enabled: enabled && !!product,
    placeholderData: (previousData) => previousData,
    refetchInterval: SEKI_CONFIG.refetchInterval,
  })
}

/**
 * Fetches the latest pipeline for a specific stage from Seki.
 * This is the correct way to get the deployed version (not from git tags).
 */
export function useLatestPipeline({
  product,
  stage,
  enabled = true,
}: UseLatestPipelineOptions) {
  return useQuery<PipelineStatusResponse | null>({
    queryKey: ['latestPipeline', product, stage],
    queryFn: async () => {
      return await fetchLatestPipeline(
        product,
        stage,
        stage === 'production' ? 'tag' : 'commit'
      )
    },
    enabled: enabled && !!product,
    refetchInterval: SEKI_CONFIG.refetchInterval,
  })
}
