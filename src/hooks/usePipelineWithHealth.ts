import { useEffect, useMemo } from 'react';
import { useUnifiedPipeline } from '@/pipeline-core';
import { useHealthMonitor, type Environment } from './useHealthMonitor';

interface UsePipelineWithHealthOptions {
  /** Full product name in format "org/repo" */
  product: string;
  /** Full 40-character commit hash */
  commit: string;
  /** Tag name (e.g., "v1.0.0") - required for production pipelines */
  tag?: string;
  enabled?: boolean;
  /** Environment override - if not provided, inferred from tag presence */
  environment?: Environment;
}

/**
 * Hook that combines pipeline fetching with automatic health endpoint extraction.
 * Uses the Unified Pipeline architecture to support multiple providers (Seki, Pulsar).
 */
export function usePipelineWithHealth({
  product,
  commit,
  tag,
  enabled = true,
  environment,
}: UsePipelineWithHealthOptions) {
  const { extractEndpointsFromEvents } = useHealthMonitor();
  const [org, repo] = useMemo(() => product.split('/'), [product]);

  // Infer environment from tag presence if not explicitly provided
  const inferredEnvironment: 'staging' | 'production' = tag ? 'production' : 'staging';
  const env = environment || inferredEnvironment;

  const pipelineResult = useUnifiedPipeline({
    org,
    repo,
    viewMode: tag ? 'tags' : 'commits',
    ref: tag || commit,
    commit: tag ? commit : undefined,
    enabled,
  });

  // Extract endpoints when pipeline data changes
  useEffect(() => {
    if (pipelineResult.data?.events && product) {
      extractEndpointsFromEvents(product, pipelineResult.data.events, env);
    }
  }, [pipelineResult.data?.events, product, extractEndpointsFromEvents, env]);

  return pipelineResult;
}
