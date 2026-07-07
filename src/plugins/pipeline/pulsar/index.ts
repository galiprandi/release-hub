/**
 * Pulsar Build Module
 *
 * Módulo autónomo para monitoring de builds de imágenes Docker
 * del workflow pulsar-nx-build.yml (Pulsar, el sistema que reemplaza a Seki).
 * Coexiste con el módulo Seki: se autodetecta si el repo tiene el workflow.
 */
export * from './types'
export { pulsarAdapter } from './adapter'
export {
	isTagBranch,
	inferRefType,
	parseAppName,
	isImageJob,
	mapGhState,
	mapStepState,
	findErrorStep,
	aggregateRunState,
	formatDuration,
} from './utils'
export { usePulsarBuilds } from './hooks/usePulsarBuilds'
export { PulsarBuildMonitor, PulsarBuildMonitorData } from './components'
