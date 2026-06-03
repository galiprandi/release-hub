/**
 * Unified Pipeline Monitor Component
 * Displays pipeline status from any provider (Seki, Pulsar, etc.)
 */

import { useState, useEffect, useCallback } from 'react'
import { GitCommit, ExternalLink, AlertTriangle, Sparkles, Loader2 } from 'lucide-react'
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
import { AISummaryCard } from '@/components/AISummaryCard'
import { BaseDialog } from '@/components/ui/BaseDialog'
import { useAISummarize } from '@galiprandi/react-tools'

interface UnifiedPipelineMonitorProps {
	org: string
	repo: string
	viewMode: ViewMode
	/** Commit hash for commits view, tag name for tags view */
	ref: string
	/**
	 * Full 40-character commit hash associated with the tag.
	 * REQUIRED when viewMode is 'tags' — the Seki API endpoint is
	 * `/pipelines/:commit/:tag`, so passing an empty string produces
	 * a double-slash URL and a 404. Must come from the tag object
	 * (e.g. latestTag?.commit), NOT from the latest staging commit.
	 */
	commit?: string
}

export function UnifiedPipelineMonitor({ org, repo, viewMode, ref, commit }: UnifiedPipelineMonitorProps) {
	const queryClient = useQueryClient()
	const { data, provider, isLoading, error, refetch } = useUnifiedPipeline({
		org,
		repo,
		viewMode,
		ref,
		commit,
	})

	// Error card state
	const [isErrorCardCollapsed, setIsErrorCardCollapsed] = useState(false)
	const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)
	const [isAiSummaryCopied, setIsAiSummaryCopied] = useState(false)

	// AI summarization for error (card)
	const { data: aiSummary, status: aiStatus, error: aiError, summarize, reset: resetAI } = useAISummarize({
		type: 'key-points',
		format: 'plain-text',
		length: 'medium',
		outputLanguage: 'es',
		streaming: true,
	})

	// AI summarization for error modal (single paragraph)
	const {
		data: modalAiSummary,
		status: modalAiStatus,
		summarize: summarizeModal,
	} = useAISummarize({
		type: 'key-points',
		format: 'plain-text',
		length: 'short',
		outputLanguage: 'es',
		streaming: true,
	})

	const isGenerating = aiStatus === 'summarizing' || aiStatus === 'initializing' || aiStatus === 'downloading'
	const isModalGenerating = modalAiStatus === 'summarizing' || modalAiStatus === 'initializing' || modalAiStatus === 'downloading'

	const handleRetry = () => {
		// Invalidate pipeline detection cache to force re-detection
		queryClient.invalidateQueries({ queryKey: ['pipeline-detection', org, repo] })
		// Also invalidate any pipeline data cache
		queryClient.invalidateQueries({ queryKey: ['pipeline'] })
	}

	// Generate AI summary of error
	const handleSummarizeError = async () => {
		if (!data?.errorMarkdown) return

		const context = 'Analiza este error de pipeline de Seki. Extrae: 1) La causa raíz del fallo, 2) Qué validación falló, 3) Qué acción se necesita para corregirlo. Sé conciso (máximo 4 líneas).'
		const textWithContext = `INSTRUCCIÓN: ${context}\n\n${data.errorMarkdown}`

		try {
			await summarize(textWithContext, context)
		} catch (err) {
			console.error('[UnifiedPipelineMonitor] Error generating summary:', err)
		}
	}

	const handleRegenerateSummary = async () => {
		queryClient.removeQueries({ queryKey: ['ai-summary'] })
		resetAI()
		await handleSummarizeError()
	}

	const handleCopyAiSummary = async () => {
		if (!aiSummary) return
		await navigator.clipboard.writeText(aiSummary)
		setIsAiSummaryCopied(true)
		setTimeout(() => setIsAiSummaryCopied(false), 2000)
	}

	// Generate AI summary for modal when it opens
	const handleSummarizeModalError = useCallback(async () => {
		if (!data?.errorMarkdown) return

		const context = 'Resume este error de pipeline de Seki en UN SOLO PÁRRAFO. Sé conciso y directo. Identifica: 1) La causa raíz, 2) Qué falló, 3) Qué acción se necesita.'
		const textWithContext = `INSTRUCCIÓN: ${context}\n\n${data.errorMarkdown}`

		try {
			await summarizeModal(textWithContext, context)
		} catch (err) {
			console.error('[UnifiedPipelineMonitor] Error generating modal summary:', err)
		}
	}, [data, summarizeModal])

	// Generate modal summary when modal opens
	useEffect(() => {
		if (isErrorModalOpen && data?.errorMarkdown && !modalAiSummary) {
			handleSummarizeModalError()
		}
	}, [isErrorModalOpen, data?.errorMarkdown, modalAiSummary, handleSummarizeModalError])

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
	const hasError = data.state === 'FAILED' && !!data.errorMarkdown

	return (
		<div className="space-y-2">
			{hasError && (
				<AISummaryCard
					summary={aiSummary || null}
					isGenerating={isGenerating}
					error={aiError?.message || null}
					onRegenerate={handleRegenerateSummary}
					onCopy={handleCopyAiSummary}
					isCollapsed={isErrorCardCollapsed}
					onToggleCollapse={() => setIsErrorCardCollapsed(!isErrorCardCollapsed)}
					isCopied={isAiSummaryCopied}
					variant="compact"
				/>
			)}
			<PipelineCard
				viewMode={viewMode}
				displayRef={data.ref}
				refType={data.refType}
				isRunning={isRunning}
				hasError={hasError}
				onViewError={() => setIsErrorModalOpen(true)}
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
			{hasError && isErrorModalOpen && (
				<BaseDialog
					open={isErrorModalOpen}
					onOpenChange={setIsErrorModalOpen}
					title={
						<div className="flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 text-destructive" />
							<span>Error del Pipeline</span>
						</div>
					}
					maxWidth="max-w-4xl"
					maxHeight="max-h-[80vh]"
					className="!p-0"
				>
					<div className="flex flex-col h-full">
						<div className="p-6 overflow-y-auto flex-1 space-y-4">
							{modalAiSummary && (
								<div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
									<div className="flex items-center gap-2 mb-2">
										<Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
										<span className="font-semibold text-sm text-purple-900 dark:text-purple-100">Resumen IA</span>
									</div>
									<p className="text-sm leading-relaxed text-purple-900 dark:text-purple-100">{modalAiSummary}</p>
								</div>
							)}
							{isModalGenerating && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="w-4 h-4 animate-spin" />
									<span>Generando resumen...</span>
								</div>
							)}
							{!modalAiSummary && !isModalGenerating && (
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Sparkles className="w-3 h-3" />
									<span>Resumen IA no disponible - API de IA no configurada</span>
								</div>
							)}
							<pre className="text-sm whitespace-pre-wrap font-mono text-foreground/90 bg-muted/50 p-4 rounded-lg border">
								{data.errorMarkdown}
							</pre>
						</div>
					</div>
				</BaseDialog>
			)}
		</div>
	)
}
