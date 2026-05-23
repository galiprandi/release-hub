/**
 * Unified Pipeline Monitor Component
 * Displays pipeline status from any provider (Seki, Pulsar, etc.)
 */

import { GitCommit, ExternalLink } from 'lucide-react'
import DayJS from '@/lib/dayjs'
import { useQueryClient } from '@tanstack/react-query'
import { useUnifiedPipeline, type ViewMode } from '../index'
import { PipelineCard, type MetaPart, SimpleTimeline } from './index'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import { StatusCard } from '@/components/ui/StatusCard'

interface UnifiedPipelineMonitorProps {
	org: string
	repo: string
	viewMode: ViewMode
	/** Commit hash for commits view, tag name for tags view */
	ref: string
}

export function UnifiedPipelineMonitor({ org, repo, viewMode, ref }: UnifiedPipelineMonitorProps) {
	const queryClient = useQueryClient()
	const { data, provider, isLoading, error, refetch } = useUnifiedPipeline({
		org,
		repo,
		viewMode,
		ref,
	})

	const handleRetry = () => {
		// Invalidate pipeline detection cache to force re-detection
		queryClient.invalidateQueries({ queryKey: ['pipeline-detection', org, repo] })
		// Also invalidate any pipeline data cache
		queryClient.invalidateQueries({ queryKey: ['pipeline'] })
	}

	// Loading state
	if (isLoading) {
		return <StatusCard type="loading" message="Cargando información del pipeline..." />
	}

	// Error state
	if (error) {
		return <StatusCard type="error" message={error.message} onRetry={refetch} />
	}

	// No provider detected
	if (!provider) {
		return (
			<StatusCard
				type="warn"
				message={`No se detectó un pipeline compatible (${org}/${repo})`}
				onRetry={handleRetry}
			/>
		)
	}

	// Provider detected but no data available
	if (!data) {
		return (
			<StatusCard
				type="warn"
				message={`No hay datos de pipeline disponibles para ${viewMode === 'tags' ? `el tag ${ref}` : 'este stage'} (${org}/${repo})`}
				onRetry={refetch}
			/>
		)
	}

	// Build metadata parts
	const metaParts: MetaPart[] = []

	if (data.commit?.author) {
		metaParts.push({
			id: 'author',
			node: <span className="font-medium text-foreground">{data.commit.author}</span>,
		})
	}

	const lastUpdated = DayJS(data.updatedAt).fromNow()
	if (lastUpdated) {
		metaParts.push({
			id: 'time',
			node: <span>{lastUpdated}</span>,
		})
	}

	if (data.commit?.message) {
		metaParts.push({
			id: 'commit',
			node: (
				<span className="inline-flex items-center gap-1 text-foreground">
					<GitCommit className="w-3.5 h-3.5" />
					{data.commit.message}
				</span>
			),
		})
	}

	const isRunning = data.state === 'STARTED' || data.state === 'RUNNING'

	return (
		<div className="space-y-2">
			<PipelineCard
				viewMode={viewMode}
				displayRef={data.ref}
				refType={data.refType}
				isRunning={isRunning}
				metaParts={metaParts}
			>
				<div className="flex items-center gap-2">
					{data.events.length > 0 ? (
						<SimpleTimeline events={data.events} />
					) : data.externalUrl ? (
						<HoverCard openDelay={100} closeDelay={100}>
							<HoverCardTrigger asChild>
								<a
									href={data.externalUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
								>
									<ExternalLink className="w-3 h-3" />
									Ver en {provider === 'pulsar' ? 'GitHub Actions' : 'Seki'}
								</a>
							</HoverCardTrigger>
							<HoverCardContent align="center" sideOffset={6} className="p-4 w-fit min-w-[280px]">
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<span className="text-sm font-semibold">{provider === 'pulsar' ? 'GitHub Actions' : 'Seki Pipeline'}</span>
										<span className="text-xs text-muted-foreground">
											{DayJS(data.updatedAt).fromNow()}
										</span>
									</div>
									<div className="text-xs text-muted-foreground">
										{data.state === 'COMPLETED' && 'Exitoso'}
										{data.state === 'FAILED' && 'Fallido'}
										{data.state === 'STARTED' && 'En progreso'}
										{data.state === 'RUNNING' && 'En progreso'}
										{data.state === 'IDLE' && 'Pendiente'}
										{data.state === 'CANCELLED' && 'Cancelado'}
									</div>
								</div>
							</HoverCardContent>
						</HoverCard>
					) : null}
				</div>
			</PipelineCard>
		</div>
	)
}
