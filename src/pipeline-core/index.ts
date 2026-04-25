/**
 * Pipeline Core - Unified pipeline monitoring abstraction
 * 
 * Provides:
 * - Common types for all pipeline providers
 * - Adapter pattern for extending to new providers
 * - Unified hook for fetching pipeline data
 * - Resilient error handling and caching
 */

export * from './types'
export { sekiAdapter } from './adapters/sekiAdapter'
export { pulsarAdapter } from './adapters/pulsarAdapter'
export { useUnifiedPipeline, usePipelineDetection } from './hooks/useUnifiedPipeline'
