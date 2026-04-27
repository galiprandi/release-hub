import { useEffect } from 'react';
import { usePipeline, usePipelineWithTag } from './usePipeline';
import { useHealthMonitor } from './useHealthMonitor';

interface UsePipelineWithHealthOptions {
  /** Full product name in format "org/repo" */
  product: string;
  /** Full 40-character commit hash */
  commit: string;
  /** Tag name (e.g., "v1.0.0") - required for production pipelines */
  tag?: string;
  enabled?: boolean;
  /** Environment override - if not provided, inferred from URL */
  environment?: 'staging' | 'production';
}

/**
 * Hook that combines pipeline fetching with automatic health endpoint extraction.
 * When pipeline data is received, it extracts service URLs from deploy events
 * and adds them to the health monitor with the specified environment.
 */
export function usePipelineWithHealth({
  product,
  commit,
  tag,
  enabled = true,
  environment,
}: UsePipelineWithHealthOptions) {
  const { extractEndpointsFromEvents } = useHealthMonitor();

  // Infer environment from tag presence if not explicitly provided
  const inferredEnvironment: 'staging' | 'production' = tag ? 'production' : 'staging';
  const env = environment || inferredEnvironment;

  // Always call both hooks to satisfy React Hook rules
  const commitPipeline = usePipeline({ product, commit, enabled: enabled && !tag });
  const tagPipeline = usePipelineWithTag({ product, commit, tag: tag || '', enabled: enabled && !!tag });

  // Use the appropriate result based on whether we have a tag
  const pipelineResult = tag ? tagPipeline : commitPipeline;

  // Extract endpoints when pipeline data changes
  useEffect(() => {
    if (pipelineResult.data?.events && product) {
      extractEndpointsFromEvents(product, pipelineResult.data.events, env);
    }
  }, [pipelineResult.data?.events, product, extractEndpointsFromEvents, env]);

  return pipelineResult;
}
