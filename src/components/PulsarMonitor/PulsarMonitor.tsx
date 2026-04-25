import { GitCommit, ExternalLink } from 'lucide-react'
import DayJS from '@/lib/dayjs'
import { useGitHubActions } from '@/hooks/useGitHubActions'
import type { MetaPart } from '@/components/pipeline/types'
import { PipelineCard } from '@/components/pipeline/PipelineCard'
import { MiniTimeline } from '@/components/SekiMonitor/MiniTimeline'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'

interface PulsarMonitorProps {
	org: string
	repo: string
}

export function PulsarMonitor({ org, repo }: PulsarMonitorProps) {
	const { runs, isLoading, error } = useGitHubActions({
		org,
		repo,
		workflowName: 'Nx Build',
		enabled: true,
	})


	if (isLoading) {
		return (
			<div className="bg-card border-2 border-gray-200 rounded-xl p-4 h-[82px] flex items-center gap-2">
				<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
				<span className="text-gray-600 text-sm">Cargando información del pipeline...</span>
			</div>
		)
	}

	if (error) {
		return (
			<div className="bg-card border-2 border-red-200 rounded-xl p-4 h-[82px] flex items-center gap-2">
				<span className="text-red-600 text-sm">Error al cargar el pipeline: {error.message}</span>
			</div>
		)
	}

	if (!runs || runs.length === 0) {
		return (
			<div className="bg-card border-2 border-amber-200 rounded-xl p-4 h-[82px] flex items-center gap-2">
				<span className="text-amber-600 text-sm">No se encontraron runs del workflow</span>
			</div>
		)
	}

	const latestRun = runs[0]
	const isRunning = latestRun.status === 'in_progress' || latestRun.status === 'queued'

	const displayRef = latestRun.head_sha.slice(0, 7)
	const lastUpdated = DayJS(latestRun.created_at).fromNow()

	const metaParts: MetaPart[] = []

	if (latestRun.commitInfo?.author) {
		metaParts.push({
			id: 'author',
			node: <span className="font-medium text-foreground">{latestRun.commitInfo.author}</span>,
		})
	}

	if (lastUpdated) {
		metaParts.push({
			id: 'time',
			node: <span>{lastUpdated}</span>,
		})
	}

	if (latestRun.commitInfo?.message) {
		metaParts.push({
			id: 'commit',
			node: (
				<span className="inline-flex items-center gap-1 text-foreground">
					<GitCommit className="w-3.5 h-3.5" />
					{latestRun.commitInfo.message}
				</span>
			),
		})
	}

	return (
		<div className="space-y-2">
			<PipelineCard
				viewMode="commits"
				displayRef={displayRef}
				refType="COMMIT"
				isRunning={isRunning}
				metaParts={metaParts}
			>
				<div className="flex items-center gap-2">
					{latestRun.events && latestRun.events.length > 0 ? (
						<MiniTimeline events={latestRun.events} />
					) : (
						<HoverCard openDelay={100} closeDelay={100}>
							<HoverCardTrigger asChild>
								<a
									href={latestRun.html_url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
								>
									<ExternalLink className="w-3 h-3" />
									Ver en GitHub
								</a>
							</HoverCardTrigger>
							<HoverCardContent align="center" sideOffset={6} className="p-4 w-fit min-w-[280px]">
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<span className="text-sm font-semibold">{latestRun.name}</span>
										<span className="text-xs text-muted-foreground">
											{DayJS(latestRun.updated_at).fromNow()}
										</span>
									</div>
									<div className="text-xs text-muted-foreground">
										{latestRun.status === 'completed' && latestRun.conclusion === 'success' && 'Exitoso'}
										{latestRun.status === 'completed' && latestRun.conclusion === 'failure' && 'Fallido'}
										{latestRun.status === 'in_progress' && 'En progreso'}
										{latestRun.status === 'queued' && 'En cola'}
									</div>
								</div>
							</HoverCardContent>
						</HoverCard>
					)}
				</div>
			</PipelineCard>
		</div>
	)
}
