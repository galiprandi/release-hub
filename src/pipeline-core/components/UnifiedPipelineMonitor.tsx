/**
 * Unified Pipeline Monitor Component
 * Displays pipeline status from any provider (Seki, Pulsar, etc.)
 */

import { GitCommit, ExternalLink } from 'lucide-react'
import DayJS from '@/lib/dayjs'
import { useUnifiedPipeline, type ViewMode } from '../index'
import { PipelineCard, type MetaPart, SimpleTimeline } from './index'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'

interface UnifiedPipelineMonitorProps {
	org: string
	repo: string
	viewMode: ViewMode
	/** Commit hash for commits view, tag name for tags view */
	ref: string
}

/**
 * Error display component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
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
				<span className="text-red-600 text-sm">Error: {message}</span>
			</div>
			{onRetry && (
				<button
					onClick={onRetry}
					className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
				>
					Reintentar
				</button>
			)}
		</div>
	)
}

/**
 * Loading state component
 */
function LoadingState() {
	return (
		<div className="flex items-center gap-2 p-4 border-2 border-gray-200 rounded-lg">
			<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
			<span className="text-gray-600 text-sm">Cargando información del pipeline...</span>
		</div>
	)
}

/**
 * No provider detected state
 */
function NoProviderState({ org, repo }: { org: string; repo: string }) {
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
}

/**
 * No data available state
 */
function NoDataState({ org, repo, tagName }: { org: string; repo: string; tagName?: string }) {
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
					<div className="text-sm text-gray-600">
						No hay datos de pipeline disponibles para {tagName ? `el tag ${tagName}` : 'este stage'}
					</div>
					<div className="text-xs text-gray-500">{org}/{repo}</div>
				</div>
			</div>
		</div>
	)
}

export function UnifiedPipelineMonitor({ org, repo, viewMode, ref }: UnifiedPipelineMonitorProps) {
	const { data, provider, isLoading, error, refetch } = useUnifiedPipeline({
		org,
		repo,
		viewMode,
		ref,
	})

	// Loading state
	if (isLoading) {
		return <LoadingState />
	}

	// Error state
	if (error) {
		return <ErrorState message={error.message} onRetry={refetch} />
	}

	// No provider detected
	if (!provider) {
		return <NoProviderState org={org} repo={repo} />
	}

	// Provider detected but no data available
	if (!data) {
		return <NoDataState org={org} repo={repo} tagName={viewMode === 'tags' ? ref : undefined} />
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
