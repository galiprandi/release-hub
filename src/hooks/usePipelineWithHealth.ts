import { useEffect, useMemo } from 'react';
import { useUnifiedPipeline } from '@/pipeline-core';
import { useHealthMonitor } from './useHealthMonitor';
import { useEffect } from 'react';
import { useUnifiedPipeline } from '@/pipeline-core/hooks/useUnifiedPipeline';
import { useHealthMonitor, type Environment } from './useHealthMonitor';
import type { Event } from '@/api/seki.type';
import type { PipelineEvent } from '@/pipeline-core/types';

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
 * Maps unified PipelineEvent back to Seki Event for health monitor compatibility.
 * This is a temporary bridge until useHealthMonitor is also unified.
 */
function mapToSekiEvent(event: PipelineEvent): Event {
  return {
    id: event.id,
    label: { es: event.name, en: event.name, br: event.name },
    state: event.state,
    created_at: event.startedAt || '',
    updated_at: event.completedAt || '',
    markdown: (event as any).markdown || '',
    subevents: event.subevents?.map(sub => ({
      id: sub.id,
      label: sub.name,
      state: sub.state,
      created_at: sub.startedAt || '',
      updated_at: sub.completedAt || '',
      // Note: markdown is only preserved if it was present in the original data.
      // Unified types don't strictly require it but Seki adapters populate it.
      markdown: (sub as any).markdown || ''
    })) || []
  };
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
  const [org, repo] = product.split('/');

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
    if (pipeline.data?.events && product) {
      // Map unified events back to Seki events for the health monitor
      const sekiEvents = pipeline.data.events.map(mapToSekiEvent);
      extractEndpointsFromEvents(product, sekiEvents, env);
    }
  }, [pipeline.data?.events, product, extractEndpointsFromEvents, env]);

  return pipeline;
}
