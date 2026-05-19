import { usePipelineDetector } from '@/hooks/usePipelineDetector'
import { SekiMonitor } from '@/components/SekiMonitor/SekiMonitor'
import { PulsarMonitor } from '@/components/PulsarMonitor/PulsarMonitor'
import { StatusCard } from '@/components/ui/StatusCard'
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
		return <StatusCard type="loading" message="Detectando pipeline..." />
	}

	if (error) {
		return (
			<StatusCard
				type="error"
				message={`Error al detectar pipeline: ${error}`}
			/>
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
				<StatusCard
					type="warn"
					message={`No hay datos de pipeline disponibles para el tag ${sekiData?.tagName || 'seleccionado'} (${org}/${repo})`}
					onRetry={sekiData?.refetch}
				/>
			)
		case 'pulsar':
			// Pulsar always shows the latest workflow run, ignoring the stage
			return <PulsarMonitor org={org} repo={repo} />
		case null:
			return (
				<StatusCard
					type="warn"
					message={`No se detectó un pipeline compatible (${org}/${repo})`}
				/>
			)
		default:
			return null
	}
}
