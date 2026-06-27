/**
 * Seki Pipeline Monitor Component
 * Componente que muestra el pipeline de Seki para ambos ambientes
 * (staging + production) en paralelo.
 * Silencioso total: renderiza null si no hay token, si está loading,
 * si hay error, o si no hay datos en ningún ambiente.
 */

import { useState, useEffect, useCallback } from 'react'
import { GitCommit, AlertTriangle, Sparkles, Loader2, Rocket, FlaskConical } from 'lucide-react'
import DayJS from '@/lib/dayjs'
import { useQueryClient } from '@tanstack/react-query'
import { useSekiPipelinesByEnv } from '../hooks/useSekiPipelinesByEnv'
import type { SekiPipelineData, MetaPart } from '../types'
import { SekiPipelineCard } from './SekiPipelineCard'
import { SekiTimeline } from './SekiTimeline'
import { sekiAdapter } from '../adapter'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import { AISummaryCard } from '@/components/shared/AISummaryCard'
import { BaseDialog } from '@/components/ui/BaseDialog'
import { useAISummarize } from '@galiprandi/react-tools'

interface SekiPipelineMonitorProps {
	org: string
	repo: string
}

/**
 * Renders a single environment's pipeline card with timeline,
 * error handling, and AI summarization.
 */
function SekiEnvPipeline({
	envLabel,
	envIcon: EnvIcon,
	data,
}: {
	envLabel: string
	envIcon: typeof Rocket
	data: SekiPipelineData
}) {
	const queryClient = useQueryClient()
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

	const handleSummarizeError = async () => {
		if (!data.errorMarkdown) return

		const context = 'Analiza este error de pipeline de Seki. Extrae: 1) La causa raíz del fallo, 2) Qué validación falló, 3) Qué acción se necesita para corregirlo. Sé conciso (máximo 4 líneas).'
		const textWithContext = `INSTRUCCIÓN: ${context}\n\n${data.errorMarkdown}`

		try {
			await summarize(textWithContext, context)
		} catch (err) {
			console.error('[SekiEnvPipeline] Error generating summary:', err)
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

	const handleSummarizeModalError = useCallback(async () => {
		if (!data.errorMarkdown) return

		const context = 'Resume este error de pipeline de Seki en UN SOLO PÁRRAFO. Sé conciso y directo. Identifica: 1) La causa raíz, 2) Qué falló, 3) Qué acción se necesita.'
		const textWithContext = `INSTRUCCIÓN: ${context}\n\n${data.errorMarkdown}`

		try {
			await summarizeModal(textWithContext, context)
		} catch (err) {
			console.error('[SekiEnvPipeline] Error generating modal summary:', err)
		}
	}, [data, summarizeModal])

	useEffect(() => {
		if (isErrorModalOpen && data.errorMarkdown && !modalAiSummary) {
			handleSummarizeModalError()
		}
	}, [isErrorModalOpen, data.errorMarkdown, modalAiSummary, handleSummarizeModalError])

	// Build metadata parts
	const metaParts: MetaPart[] = []

	// Environment label as first meta part
	metaParts.push({
		id: 'env',
		node: (
			<span className="inline-flex items-center gap-1 font-medium text-foreground">
				<EnvIcon className="w-3.5 h-3.5" />
				{envLabel}
			</span>
		),
	})

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
			<SekiPipelineCard
				viewMode={data.refType === 'TAG' ? 'tags' : 'commits'}
				displayRef={data.ref}
				refType={data.refType}
				isRunning={isRunning}
				hasError={hasError}
				onViewError={() => setIsErrorModalOpen(true)}
				metaParts={metaParts}
			>
				<div className="flex items-center gap-2">
					{data.events.length > 0 ? (
						<SekiTimeline events={data.events} />
					) : data.externalUrl ? (
						<HoverCard openDelay={100} closeDelay={100}>
							<HoverCardTrigger asChild>
								<a
									href={data.externalUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
								>
									Ver en Seki
								</a>
							</HoverCardTrigger>
							<HoverCardContent align="center" sideOffset={6} className="p-4 w-fit min-w-[280px]">
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<span className="text-sm font-semibold">Seki Pipeline</span>
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
			</SekiPipelineCard>
			{hasError && isErrorModalOpen && (
				<BaseDialog
					open={isErrorModalOpen}
					onOpenChange={setIsErrorModalOpen}
					title={
						<div className="flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 text-destructive" />
							<span>Error del Pipeline - {envLabel}</span>
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

export function SekiPipelineMonitor({ org, repo }: SekiPipelineMonitorProps) {
	const { data, isLoading, error } = useSekiPipelinesByEnv({
		org,
		repo,
	})

	// === SILENCIOSO TOTAL ===
	if (!sekiAdapter.hasToken()) {
		return null
	}

	if (isLoading) {
		return null
	}

	if (error) {
		return null
	}

	if (!data) {
		return null
	}

	// Si no hay datos en ningún ambiente, no renderizar nada
	if (!data.staging && !data.production) {
		return null
	}

	return (
		<div className="space-y-3">
			{data.staging && (
				<SekiEnvPipeline
					envLabel="Staging"
					envIcon={FlaskConical}
					data={data.staging}
				/>
			)}
			{data.production && (
				<SekiEnvPipeline
					envLabel="Production"
					envIcon={Rocket}
					data={data.production}
				/>
			)}
		</div>
	)
}
