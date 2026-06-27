/**
 * Seki Pipeline Module
 *
 * Módulo autónomo para monitoring de pipelines de Seki.
 * Sin abstracción multi-provider.
 * Usa el endpoint /pipelines/latest-by-environment para obtener
 * staging + production en una sola llamada.
 */

export * from './types'
export { sekiAdapter, type SekiPipelinesByEnv } from './adapter'
export { extractRoutes, getPipelineStatusInfo, type SekiPipelineStatusInfo } from './utils'
export { useSekiPipelinesByEnv } from './hooks/useSekiPipelinesByEnv'
export { useHealthMonitor, type Environment, type HealthEndpoint, type UseHealthMonitorReturn } from './hooks/useHealthMonitor'
export { usePipelineWithHealth } from './hooks/usePipelineWithHealth'
export { SekiPipelineMonitor, SekiPipelineCard, SekiTimeline, type SekiPipelineCardProps } from './components'
