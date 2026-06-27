import { useEffect, useMemo } from 'react';
import { useSekiPipelinesByEnv } from './useSekiPipelinesByEnv';
import { useHealthMonitor } from './useHealthMonitor';

interface UsePipelineWithHealthOptions {
  /** Full product name in format "org/repo" */
  product: string;
  enabled?: boolean;
}

/**
 * Hook que combina el fetching de pipeline Seki (ambos ambientes)
 * con la extracción automática de endpoints de salud.
 * Usa el endpoint /pipelines/latest-by-environment.
 */
export function usePipelineWithHealth({
  product,
  enabled = true,
}: UsePipelineWithHealthOptions) {
  const { extractEndpointsFromEvents } = useHealthMonitor();

  // Extract org and repo from product string with stabilization
  const [org, repo] = useMemo(() => {
    const [o, r] = product.split('/');
    return [o || '', r || ''];
  }, [product]);

  const pipeline = useSekiPipelinesByEnv({
    org,
    repo,
    enabled,
  });

  // React Compiler compatibility: extract deep properties to local variables
  const stagingEvents = pipeline.data?.staging?.events;
  const productionEvents = pipeline.data?.production?.events;

  // Extract staging endpoints when staging pipeline data changes
  useEffect(() => {
    if (stagingEvents && product) {
      extractEndpointsFromEvents(product, stagingEvents, 'staging');
    }
  }, [stagingEvents, product, extractEndpointsFromEvents]);

  // Extract production endpoints when production pipeline data changes
  useEffect(() => {
    if (productionEvents && product) {
      extractEndpointsFromEvents(product, productionEvents, 'production');
    }
  }, [productionEvents, product, extractEndpointsFromEvents]);

  return pipeline;
}
