import { usePipelineDetector } from '@/hooks/usePipelineDetector'
import { SekiMonitor } from '@/components/SekiMonitor/SekiMonitor'
import { PulsarMonitor } from '@/components/PulsarMonitor/PulsarMonitor'
import type { PipelineStatusResponse } from '@/api/seki.type'
import type { ViewMode } from '@/components/pipeline/types'

export interface PipelineMonitorProps {
	org: string
	repo: string
	// Seki data for rendering SekiMonitor with actual pipeline data
	sekiData?: {
		pipeline?: PipelineStatusResponse
		viewMode?: ViewMode
		gitDate?: string
		isLoading?: boolean
		error?: Error | null
		refetch?: () => void
		tagName?: string
	}
}

export function PipelineMonitor({ org, repo, sekiData }: PipelineMonitorProps) {
	const { plugin, loading, error } = usePipelineDetector({ org, repo })

	if (loading) {
		return (
			<div className="flex items-center gap-2 p-4 border-2 border-gray-200 rounded-lg">
				<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
				<span className="text-gray-600 text-sm">Detectando pipeline...</span>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex items-center justify-between p-4 border-2 border-red-200 rounded-lg">
				<div className="flex items-center gap-2">
					<div className="text-red-600">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="10" />
							<path d="m15 9-6 6" />
							<path d="m9 9 6 6" />
						</svg>
					</div>
					<span className="text-red-600 text-sm">Error al detectar pipeline: {error}</span>
				</div>
			</div>
		)
	}

	switch (plugin) {
		case 'seki':
			// Only render SekiMonitor if pipeline data is provided
			if (sekiData && sekiData.pipeline) {
				return (
					<SekiMonitor
						pipeline={sekiData.pipeline}
						viewMode={sekiData.viewMode || 'commits'}
						gitDate={sekiData.gitDate}
						isLoading={sekiData.isLoading || false}
						error={sekiData.error}
					/>
				)
			}
			// If no pipeline data, Seki might not have data for this specific tag
			return (
				<div className="flex items-center justify-between gap-2 p-4 border-2 border-gray-200 rounded-lg">
					<div className="flex items-center gap-2">
						<div className="text-gray-500">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="10" />
								<path d="M12 16v-4" />
								<path d="M12 8h.01" />
							</svg>
						</div>
						<div className="flex-1">
							<div className="text-sm text-gray-600">No hay datos de pipeline disponibles para el tag {sekiData?.tagName || 'seleccionado'}</div>
							<div className="text-xs text-gray-500">{org}/{repo}</div>
						</div>
					</div>
					{sekiData?.refetch && (
						<button
							onClick={() => sekiData.refetch?.()}
							className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
						>
							Reintentar
						</button>
					)}
				</div>
			)
		case 'pulsar':
			// Pulsar always shows the latest workflow run, ignoring the stage
			return <PulsarMonitor org={org} repo={repo} />
		case null:
			return (
				<div className="flex items-center gap-2 p-4 border-2 border-gray-200 rounded-lg">
					<div className="text-gray-500">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 16v-4" />
							<path d="M12 8h.01" />
						</svg>
					</div>
					<div className="flex-1">
						<div className="text-sm text-gray-600">No se detectó un pipeline compatible</div>
						<div className="text-xs text-gray-500">{org}/{repo}</div>
					</div>
				</div>
			)
		default:
			return null
	}
}
