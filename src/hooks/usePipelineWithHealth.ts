import { useEffect, useMemo } from 'react';
import { useUnifiedPipeline } from '@/pipeline-core/hooks/useUnifiedPipeline';
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

  // Extract org and repo from product string with stabilization
  const [org, repo] = useMemo(() => {
    const [o, r] = product.split('/');
    return [o || '', r || ''];
  }, [product]);

  // Infer environment from tag presence if not explicitly provided
  const inferredEnvironment: Environment = tag ? 'production' : 'staging';
  const env = environment || inferredEnvironment;

  const pipeline = useUnifiedPipeline({
    org,
    repo,
    viewMode: tag ? 'tags' : 'commits',
    ref: tag || commit,
    commit: tag ? commit : undefined,
    enabled,
  });

  // React Compiler compatibility: extract deep property to local variable
  const pipelineEvents = pipeline.data?.events;

  // Extract endpoints when pipeline data changes
  useEffect(() => {
    if (pipelineEvents && product) {
      // useHealthMonitor.extractEndpointsFromEvents now accepts PipelineEvent[]
      // directly after recent refactoring, eliminating the need for mapToSekiEvent
      extractEndpointsFromEvents(product, pipelineEvents, env);
    }
  }, [pipelineEvents, product, extractEndpointsFromEvents, env]);

  return pipelineResult;
}
