import { useQuery } from '@tanstack/react-query'
import { fetchPipeline, fetchPipelineWithTag } from '@/api/seki'
import type { PipelineStatusResponse } from '@/api/seki.type'
import { SEKI_CONFIG } from '@/config/seki'

interface UsePipelineOptions {
  /** Full product name in format "org/repo" */
  product: string
  /** Full 40-character commit hash (short 7-char hashes will not work) */
  commit: string
  enabled?: boolean
}

interface UsePipelineWithTagOptions {
  /** Full product name in format "org/repo" */
  product: string
  /** Full 40-character commit hash */
  commit: string
  /** Tag name (e.g., "v1.0.0") - required for production pipelines */
  tag: string
  enabled?: boolean
}

/**
 * Fetches a single pipeline by product and commit hash.
 * ⚠️ Requires the full 40-character commit hash - short hashes (7 chars) will return 404.
 */
export function usePipeline({
  product,
  commit,
  enabled = true,
}: UsePipelineOptions) {
  return useQuery<PipelineStatusResponse>({
    queryKey: ['pipeline', product, commit],
    queryFn: async () => {
      const { data } = await fetchPipeline(product, commit)
      return data
    },
    enabled: enabled && !!product && !!commit,
    refetchInterval: SEKI_CONFIG.refetchInterval,
  })
}

/**
 * Fetches a pipeline by product, commit hash AND tag name.
 * Used for production pipelines that require both identifiers.
 * URL format: /products/{product}/pipelines/{commit}/{tag}
 */
export function usePipelineWithTag({
  product,
  commit,
  tag,
  enabled = true,
}: UsePipelineWithTagOptions) {
  return useQuery<PipelineStatusResponse>({
    queryKey: ['pipeline', product, commit, tag],
    queryFn: async () => {
      const { data } = await fetchPipelineWithTag(product, commit, tag)
      return data
    },
    enabled: enabled && !!product && !!commit && !!tag,
    refetchInterval: SEKI_CONFIG.refetchInterval,
  })
}
