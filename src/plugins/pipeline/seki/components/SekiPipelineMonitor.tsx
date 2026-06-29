/**
 * Seki Pipeline Monitor — Componente productivo
 *
 * Muestra el pipeline de Seki para staging y production en paralelo.
 * Silencioso total: renderiza null si no hay token, si está loading,
 * si hay error, o si no hay datos.
 *
 * Design:
 * - Single compact card layout (mismo layout para OK y FAIL)
 * - Header: ref + status + env
 * - Meta: author · time · duration · commit
 * - Deploy URLs: chips con copy-to-clipboard
 * - Stages: chips clickeables debajo de URLs, expanden on click (accordion)
 * - Click en stage fallido: expande + dispara IA silenciosamente si está disponible
 * - Análisis IA (diagnóstico/comando/corrección) dentro del panel del stage expandido
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Loader2,
	Circle,
	GitCommit,
	Tag,
	FlaskConical,
	Rocket,
	ExternalLink,
	Clock,
	AlertCircle,
	Sparkles,
	ChevronRight,
	Copy,
	Check,
} from 'lucide-react'
import { useAIPrompt } from '@galiprandi/react-tools'
import DayJS from '@/lib/dayjs'
import { useSekiPipelinesByEnv } from '../hooks/useSekiPipelinesByEnv'
import { sekiAdapter } from '../adapter'
import type { SekiPipelineData, SekiPipelineState, SekiStage, SekiPipelineEvent } from '../types'
import { BaseDialog } from '@/components/ui/BaseDialog'

// === AI Failure Summary ===

const FAILURE_SYSTEM_PROMPT = `Sos un DevOps Engineer senior de Cencosud especializado en Kubernetes, CI/CD y observabilidad. Tu audiencia es un desarrollador que hizo un deploy que falló y necesita un diagnóstico rápido para actuar.

Analizá el reporte del pipeline (stages, timings, log de error) y generá un informe estructurado.

Reglas:
- Hablá en español, directo y técnico. Segunda persona ("tu deploy de docs...", "ejecutá...").
- NO digas "el deploy falló" ni "hubo un error" — el dev ya lo sabe.
- Nombrá el servicio específico (docs, bff, scheduler-service), no "web" o "el servicio".
- Cité la línea exacta del log que revela el problema, entre comillas.
- Si el log tiene un comando kubectl/docker, usalo como base para el COMANDO.
- Correlacioná con el contexto: si el build pasó OK pero el deploy falló, el problema es runtime no de código.

Formato de salida (exactamente 3 líneas, sin markdown, sin numeración):
DIAGNOSTICO: <servicio> — <tipo de error>. Evidencia: "<frase citada del log>"
COMANDO: <comando exacto para investigar, con namespace/selector del log>
CORRECCION: <paso concreto para fix, o "revisar logs del pod con el comando anterior" si no hay info suficiente>

Ejemplos:
DIAGNOSTICO: docs — pods no encontrados en producción. Evidencia: "kubectl get pods --namespace=linebreaker --selector=project=docs"
COMANDO: kubectl get pods -n linebreaker --selector=project=docs
CORRECCION: Verificar que el deployment exista en producción: kubectl get deploy -n linebreaker project=docs

DIAGNOSTICO: bff — build falló por dependencia faltante. Evidencia: "npm ERR! Cannot find module 'express'"
COMANDO: cd packages/bff && npm install
CORRECCION: Agregar 'express' a package.json del bff y reconstruir la imagen

DIAGNOSTICO: scheduler-service — OOMKilled, límite 512Mi excedido. Evidencia: "Last State: Terminated (Reason: OOMKilled, Exit Code: 137)"
COMANDO: kubectl describe pod -n linebreaker --selector=app=scheduler-service
CORRECCION: Aumentar resources.limits.memory a 1Gi en deployment.yaml del scheduler-service`

/** Fallback sin IA: extrae info básica del errorMarkdown con regex */
function extractFallback(errorMarkdown?: string): { diagnosis: string | null; command: string | null } {
	if (!errorMarkdown) return { diagnosis: null, command: null }

	const cmdMatch = errorMarkdown.match(/(kubectl|docker|helm)\s+[\w\s\-=.:/]+(?:--\w+[\w-]*=?[\w./:-]*)*/i)
	const command = cmdMatch ? cmdMatch[0].trim() : null

	const serviceMatch = errorMarkdown.match(/(?:Deploy\s+\w+\s+\((\w+)\)|project=(\w+)|deploy\s+of\s+(\w+)\s)/i)
	const service = serviceMatch ? (serviceMatch[1] || serviceMatch[2] || serviceMatch[3]) : null

	let errorType = 'error desconocido'
	if (/CrashLoopBackOff/i.test(errorMarkdown)) errorType = 'CrashLoopBackOff'
	else if (/ImagePullBackOff|image not found/i.test(errorMarkdown)) errorType = 'imagen no encontrada'
	else if (/OOMKilled|out of memory/i.test(errorMarkdown)) errorType = 'OOMKilled'
	else if (/timeout|timed out/i.test(errorMarkdown)) errorType = 'timeout'
	else if (/FAIL/i.test(errorMarkdown)) errorType = 'fallo de deploy'

	const diagnosis = service ? `${service} — ${errorType}` : errorType
	return { diagnosis, command }
}

/** Genera contexto del stage fallido para el modelo */
function buildStageContext(pipeline: SekiPipelineData, stage: SekiStage): string {
	const lines: string[] = []
	lines.push(`Pipeline: ${pipeline.ref} (${pipeline.refType}) — ${pipeline.state}`)
	if (pipeline.commit?.message) lines.push(`Commit: ${pipeline.commit.message}`)
	lines.push('')
	lines.push(`Stage fallido: ${stage.label} (${stage.state})`)
	const stageDur = formatDuration(stage.startedAt, stage.completedAt)
	if (stageDur) lines.push(`Duración del stage: ${stageDur}`)
	lines.push('')
	lines.push('Subeventos:')
	for (const sub of stage.subevents) {
		const parts = [sub.label || sub.name || sub.id, sub.state]
		if (sub.deployUrl) parts.push(`→ ${sub.deployUrl}`)
		lines.push(`  - ${parts.join(' | ')}`)
		if (sub.markdown && (sub.state === 'FAILED' || sub.state === 'WARN')) {
			lines.push(`    LOG: ${sub.markdown}`)
		}
	}
	return lines.join('\n')
}

function useFailureSummary(pipelineData: SekiPipelineData | null, stage: SekiStage | null, aiAvailable: boolean) {
	const { data, status, error, prompt, reset } = useAIPrompt({
		initialPrompts: [{ role: 'system', content: FAILURE_SYSTEM_PROMPT }],
		streaming: true,
		warmup: false,
	})

	const isGenerating = status === 'prompting' || status === 'initializing' || status === 'downloading'
	const hasResult = !!data && !isGenerating

	const stageMarkdown = stage?.subevents
		.filter((s) => (s.state === 'FAILED' || s.state === 'WARN') && s.markdown)
		.map((s) => s.markdown)
		.join('\n\n') || undefined
	const fallback = extractFallback(stageMarkdown)

	let diagnosis: string | null = null
	let command: string | null = null
	let correction: string | null = null
	if (hasResult) {
		const lines = data.split('\n').map((l) => l.trim()).filter(Boolean)
		for (const line of lines) {
			const diagMatch = line.match(/^DIAGNOSTICO\s*[:：]\s*(.+)/i)
			const cmdMatch = line.match(/^COMANDO\s*[:：]\s*(.+)/i)
			const fixMatch = line.match(/^CORRECCION\s*[:：]\s*(.+)/i)
			if (diagMatch) diagnosis = diagMatch[1].trim()
			else if (cmdMatch) command = cmdMatch[1].trim()
			else if (fixMatch) correction = fixMatch[1].trim()
		}
		if (!diagnosis && lines.length > 0) diagnosis = lines[0]
		if (!command) {
			for (const line of lines) {
				if (/^(kubectl|docker|helm|eksctl|gcloud)\s/.test(line)) {
					command = line
					break
				}
			}
		}
		if (!correction && lines.length > 1) correction = lines[lines.length - 1]
	}

	const context = pipelineData && stage ? buildStageContext(pipelineData, stage) : ''

	const trigger = useCallback(() => {
		if (context && aiAvailable) prompt(context)
	}, [context, aiAvailable, prompt])

	const regenerate = useCallback(() => {
		reset()
		if (context && aiAvailable) prompt(context)
	}, [context, aiAvailable, prompt, reset])

	const useFallback = !aiAvailable
	return {
		diagnosis: useFallback ? fallback.diagnosis : diagnosis,
		command: useFallback ? fallback.command : command,
		correction: useFallback ? null : correction,
		isGenerating: useFallback ? false : isGenerating,
		hasResult: useFallback ? !!fallback.diagnosis : hasResult,
		isFallback: useFallback,
		error: useFallback ? null : (error?.message || null),
		trigger,
		regenerate,
	}
}

// === Jira filter: ignorar validación de Jira (WARN conocido, no bloqueante) ===

const JIRA_IGNORED_IDS = ['JIRA_validation_jira', 'CR_CGT_compliance']

function isJiraSubevent(sub: SekiPipelineEvent): boolean {
	return JIRA_IGNORED_IDS.includes(sub.id) || /jira|cgt.*compliance/i.test(sub.label || sub.name || sub.id)
}

function filterStage(stage: SekiStage): SekiStage {
	const filteredSubs = stage.subevents.filter((s) => !isJiraSubevent(s))
	const hasFail = filteredSubs.some((s) => s.state === 'FAILED')
	const hasWarn = filteredSubs.some((s) => s.state === 'WARN')
	const newState = hasFail ? 'FAILED' : hasWarn ? 'WARN' : 'COMPLETED'
	return { ...stage, subevents: filteredSubs, state: newState as SekiPipelineState }
}

function filterPipelineData(data: SekiPipelineData): SekiPipelineData {
	if (!data.stages) return data
	const filteredStages = data.stages.map(filterStage)
	const hasFail = filteredStages.some((s) => s.state === 'FAILED')
	const hasWarn = filteredStages.some((s) => s.state === 'WARN')
	const newState = hasFail ? 'FAILED' : hasWarn ? 'WARN' : 'COMPLETED'
	const errorSubs = filteredStages
		.flatMap((s) => s.subevents)
		.filter((s) => (s.state === 'FAILED' || s.state === 'WARN') && s.markdown)
	const newErrorMarkdown = errorSubs.length > 0
		? errorSubs.map((s) => s.markdown).join('\n\n---\n\n')
		: undefined
	return { ...data, stages: filteredStages, state: newState as SekiPipelineState, errorMarkdown: newErrorMarkdown }
}

// === Status helpers ===

function statusConfig(state: SekiPipelineState) {
	switch (state) {
		case 'COMPLETED':
		case 'SUCCESS':
			return {
				icon: CheckCircle2,
				color: 'text-emerald-600 dark:text-emerald-400',
				bg: 'bg-emerald-500',
				badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
				label: 'OK',
			}
		case 'FAILED':
			return {
				icon: XCircle,
				color: 'text-red-600 dark:text-red-400',
				bg: 'bg-red-500',
				badge: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
				label: 'FALLÓ',
			}
		case 'WARN':
			return {
				icon: AlertTriangle,
				color: 'text-amber-600 dark:text-amber-400',
				bg: 'bg-amber-500',
				badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
				label: 'WARN',
			}
		case 'RUNNING':
		case 'STARTED':
			return {
				icon: Loader2,
				color: 'text-blue-600 dark:text-blue-400',
				bg: 'bg-blue-500 animate-pulse',
				badge: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
				label: 'EN PROGRESO',
			}
		default:
			return {
				icon: Circle,
				color: 'text-muted-foreground',
				bg: 'bg-muted',
				badge: 'bg-muted text-muted-foreground border border-border',
				label: 'IDLE',
			}
	}
}

function formatDuration(start?: string, end?: string): string | undefined {
	if (!start) return undefined
	const startDate = DayJS(start)
	const endDate = end ? DayJS(end) : DayJS()
	const diffSecs = Math.max(0, endDate.diff(startDate, 'second'))
	const mins = Math.floor(diffSecs / 60)
	const secs = diffSecs % 60
	if (mins > 0) return `${mins}m ${secs}s`
	return `${secs}s`
}

// === Subevent Row ===

function SubeventRow({ sub }: { sub: SekiPipelineEvent }) {
	const config = statusConfig(sub.state)
	const Icon = config.icon
	const duration = formatDuration(sub.startedAt, sub.completedAt)

	return (
		<div className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-muted/30 transition-colors">
			<div className="flex items-center gap-2 min-w-0">
				<Icon className={`w-3 h-3 shrink-0 ${config.color} ${sub.state === 'RUNNING' || sub.state === 'STARTED' ? 'animate-spin' : ''}`} />
				<span className="text-xs text-foreground truncate">{sub.label || sub.name}</span>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{sub.deployUrl && (
					<a
						href={sub.deployUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-[10px] text-primary hover:text-primary/80 inline-flex items-center gap-0.5 transition-colors"
						onClick={(e) => e.stopPropagation()}
					>
						<ExternalLink className="w-2.5 h-2.5" />
						url
					</a>
				)}
				{duration && <span className="text-[10px] text-muted-foreground tabular-nums">{duration}</span>}
			</div>
		</div>
	)
}

// === Deploy URL chip with copy-to-clipboard ===

function DeployUrlChip({ label, url }: { label: string; url: string }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(async (e: React.MouseEvent) => {
		e.stopPropagation()
		e.preventDefault()
		try {
			await navigator.clipboard.writeText(url)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// silently ignore
		}
	}, [url])

	return (
		<span className="group inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-primary bg-primary/5 border border-primary/20 rounded-md hover:bg-primary/10 transition-colors">
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1"
				onClick={(e) => e.stopPropagation()}
			>
				{label}
				<ExternalLink className="w-2.5 h-2.5" />
			</a>
			<button
				type="button"
				onClick={handleCopy}
				title="Copiar URL"
				className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/20"
			>
				{copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
			</button>
		</span>
	)
}

// === Expanded Stage Panel (with AI analysis inside) ===

function StagePanel({ stage, pipeline, aiAvailable, onOpenLog }: {
	stage: SekiStage
	pipeline: SekiPipelineData
	aiAvailable: boolean
	onOpenLog: () => void
}) {
	const config = statusConfig(stage.state)
	const duration = formatDuration(stage.startedAt, stage.completedAt)
	const failedSubs = stage.subevents.filter((s) => s.state === 'FAILED' || s.state === 'WARN')
	const hasError = failedSubs.length > 0

	const ai = useFailureSummary(hasError ? pipeline : null, hasError ? stage : null, aiAvailable)
	const { hasResult, isGenerating, trigger } = ai

	const aiTriggeredRef = useRef(false)
	useEffect(() => {
		if (hasError && aiAvailable && !aiTriggeredRef.current && !hasResult && !isGenerating) {
			aiTriggeredRef.current = true
			trigger()
		}
	}, [hasError, aiAvailable, hasResult, isGenerating, trigger])

	return (
		<div className="border border-border/60 rounded-lg overflow-hidden bg-muted/10">
			<div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40">
				<div className="flex items-center gap-2">
					<config.icon className={`w-4 h-4 ${config.color}`} />
					<span className="text-xs font-bold text-foreground">{stage.label}</span>
					<span className={`px-1.5 py-0 text-[9px] rounded uppercase tracking-wider ${config.badge}`}>
						{config.label}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{hasError && ai.hasResult && !ai.isGenerating && !ai.isFallback && (
						<button
							type="button"
							onClick={ai.regenerate}
							className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
							title="Regenerar análisis"
						>
							↻
						</button>
					)}
					{hasError && (
						<button
							type="button"
							onClick={onOpenLog}
							className="text-[10px] font-bold underline hover:opacity-70 transition-opacity"
						>
							Ver log
						</button>
					)}
					{duration && (
						<span className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-1">
							<Clock className="w-2.5 h-2.5" />
							{duration}
						</span>
					)}
				</div>
			</div>

			<div className="p-2 space-y-0.5">
				{stage.subevents.map((sub) => (
					<SubeventRow key={sub.id} sub={sub} />
				))}
			</div>

			{hasError && (
				<div className="px-3 py-3 border-t border-border/40 bg-destructive/5 space-y-2.5">
					<div className="flex items-center gap-2">
						{ai.isGenerating ? (
							<Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-purple-500 dark:text-purple-400" />
						) : ai.isFallback ? (
							<AlertCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
						) : ai.hasResult ? (
							<Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
						) : (
							<AlertCircle className="w-3.5 h-3.5 shrink-0 text-destructive/60" />
						)}
						{ai.isGenerating && (
							<span className="text-[11px] text-muted-foreground italic">Analizando con IA...</span>
						)}
						{ai.isFallback && !ai.hasResult && (
							<span className="text-[11px] text-muted-foreground italic">IA no disponible</span>
						)}
						{ai.error && !ai.isGenerating && !ai.isFallback && (
							<span className="text-[10px] text-muted-foreground">{ai.error}</span>
						)}
					</div>

					{!ai.isGenerating && ai.hasResult && (ai.diagnosis || ai.command || ai.correction) && (
						<div className="space-y-2">
							{ai.diagnosis && (
								<div className="space-y-0.5">
									<span className="text-[9px] font-bold uppercase tracking-wider text-destructive/70 dark:text-destructive/60">
										Diagnóstico
									</span>
									<p className="text-xs text-foreground/90 font-medium leading-relaxed">{ai.diagnosis}</p>
								</div>
							)}
							{ai.command && (
								<div className="space-y-0.5">
									<span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
										Comando
									</span>
									<code className="block text-[11px] font-mono text-primary bg-primary/5 px-2 py-1.5 rounded break-all">
										{ai.command}
									</code>
								</div>
							)}
							{ai.correction && (
								<div className="space-y-0.5">
									<span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
										Corrección
									</span>
									<p className="text-xs text-foreground/80 leading-relaxed">{ai.correction}</p>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

// === Environment Card ===

interface EnvCardProps {
	envLabel: string
	envIcon: typeof Rocket
	data: SekiPipelineData
}

function EnvCard({ envLabel, envIcon: EnvIcon, data }: EnvCardProps) {
	const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
	const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

	const filteredData = filterPipelineData(data)
	const config = statusConfig(filteredData.state)
	const StatusIcon = config.icon

	const totalDuration = formatDuration(filteredData.startedAt, filteredData.completedAt)
	const lastUpdated = DayJS(filteredData.updatedAt).fromNow()

	const stages = filteredData.stages || []
	const failedStages = stages.filter((s) => s.state === 'FAILED' || s.state === 'WARN')
	const deploySubs = stages
		.flatMap((s) => s.subevents)
		.filter((s) => s.deployUrl && (s.state === 'COMPLETED' || s.state === 'SUCCESS'))

	const RefTypeIcon = filteredData.refType === 'TAG' ? Tag : GitCommit

	const aiAvailable = typeof window !== 'undefined' && typeof (window as unknown as { LanguageModel?: unknown }).LanguageModel !== 'undefined'

	const expandedStage = expandedStageId ? stages.find((s) => s.id === expandedStageId) : null

	const handleStageClick = (stageId: string) => {
		setExpandedStageId(expandedStageId === stageId ? null : stageId)
	}

	return (
		<div className={`bg-card border rounded-xl p-4 transition-all duration-500 ${
			filteredData.state === 'FAILED' ? 'ring-1 ring-destructive/20' : ''
		} ${
			filteredData.state === 'WARN' ? 'ring-1 ring-amber-400/20' : ''
		}`}>
			<div className="flex items-start gap-3">
				<div className={`w-1 rounded-full self-stretch ${config.bg}`} />
				<div className="flex-1 min-w-0 space-y-2">

					{/* Header: ref + status + env */}
					<div className="flex items-center gap-2 flex-wrap">
						<RefTypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
						<span className="font-mono text-sm font-semibold text-foreground">{filteredData.ref}</span>
						<span className={`px-1.5 py-0 text-[9px] rounded uppercase tracking-wider ${
							filteredData.refType === 'TAG'
								? 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
								: 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
						}`}>
							{filteredData.refType}
						</span>
						<span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${config.badge}`}>
							<StatusIcon className={`w-3 h-3 ${config.color} ${filteredData.state === 'RUNNING' || filteredData.state === 'STARTED' ? 'animate-spin' : ''}`} />
							{config.label}
						</span>
						<div className="flex items-center gap-1 ml-auto">
							<EnvIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
								{envLabel}
							</span>
						</div>
					</div>

					{/* Meta: author · time · duration */}
					<div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
						{filteredData.commit?.author && (
							<span className="font-medium text-foreground/80 truncate max-w-[200px]">{filteredData.commit.author}</span>
						)}
						<span className="text-muted-foreground/40">·</span>
						<span>{lastUpdated}</span>
						{totalDuration && (
							<>
								<span className="text-muted-foreground/40">·</span>
								<span className="inline-flex items-center gap-1 tabular-nums">
									<Clock className="w-2.5 h-2.5" />
									{totalDuration}
								</span>
							</>
						)}
					</div>
					{filteredData.commit?.message && (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
							<GitCommit className="w-3 h-3 shrink-0" />
							<span className="truncate">{filteredData.commit.message}</span>
						</div>
					)}

					{/* Deploy URLs (with copy-to-clipboard) */}
					{deploySubs.length > 0 && (
						<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 shrink-0">
								Deploy:
							</span>
							{deploySubs.map((sub) => (
								<DeployUrlChip key={sub.id} label={sub.label || sub.name || sub.id} url={sub.deployUrl!} />
							))}
						</div>
					)}

					{/* Stages: clickable chips, expand on click */}
					{stages.length > 0 && (
						<div className="space-y-2 pt-1">
							<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
								{stages.map((stage) => {
									const isFailed = stage.state === 'FAILED' || stage.state === 'WARN'
									const isExpanded = expandedStageId === stage.id
									const stageConfig = statusConfig(stage.state)
									const StageIcon = stageConfig.icon
									return (
										<button
											key={stage.id}
											type="button"
											onClick={() => handleStageClick(stage.id)}
											className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 ${
												isExpanded
													? 'bg-foreground/10 text-foreground ring-1 ring-border'
													: isFailed
														? `${stageConfig.badge} hover:scale-105`
														: 'bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/60'
											}`}
										>
											<StageIcon className={`w-3 h-3 ${stageConfig.color} ${stage.state === 'RUNNING' || stage.state === 'STARTED' ? 'animate-spin' : ''}`} />
											{stage.label}
											<ChevronRight className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
										</button>
									)
								})}
							</div>

							{expandedStage && (
								<StagePanel
									stage={expandedStage}
									pipeline={filteredData}
									aiAvailable={aiAvailable}
									onOpenLog={() => setIsErrorModalOpen(true)}
								/>
							)}
						</div>
					)}

				</div>
			</div>

			{/* Error modal */}
			{isErrorModalOpen && filteredData.errorMarkdown && (
				<BaseDialog
					open={isErrorModalOpen}
					onOpenChange={setIsErrorModalOpen}
					title={
						<div className="flex items-center gap-2">
							<AlertCircle className="w-5 h-5 text-destructive" />
							<span>Error del Pipeline — {envLabel}</span>
						</div>
					}
					maxWidth="max-w-4xl"
					maxHeight="max-h-[80vh]"
					className="!p-0"
				>
					<div className="p-6 overflow-y-auto">
						{failedStages.length > 0 && (
							<div className="mb-4 space-y-2">
								<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
									Stages con problemas ({failedStages.length})
								</span>
								{failedStages.map((stage) => (
									<div key={stage.id} className="border border-border/60 rounded-lg overflow-hidden bg-muted/10">
										<div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40">
											<span className="text-xs font-bold text-foreground">{stage.label}</span>
										</div>
										<div className="p-2 space-y-0.5">
											{stage.subevents.map((sub) => (
												<SubeventRow key={sub.id} sub={sub} />
											))}
										</div>
									</div>
								))}
							</div>
						)}
						<div className="mt-4">
							<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
								Log completo
							</span>
							<pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90 bg-muted/50 p-4 rounded-lg border overflow-x-auto">
								{filteredData.errorMarkdown}
							</pre>
						</div>
					</div>
				</BaseDialog>
			)}
		</div>
	)
}

// === Main Component ===

interface SekiPipelineMonitorProps {
	org: string
	repo: string
}

export function SekiPipelineMonitor({ org, repo }: SekiPipelineMonitorProps) {
	const { data, isLoading, error } = useSekiPipelinesByEnv({ org, repo })

	// Silencioso total
	if (!sekiAdapter.hasToken()) return null
	if (isLoading) return null
	if (error) return null
	if (!data) return null
	if (!data.staging && !data.production) return null

	return (
		<div className="space-y-3">
			{data.staging && (
				<EnvCard envLabel="Staging" envIcon={FlaskConical} data={data.staging} />
			)}
			{data.production && (
				<EnvCard envLabel="Production" envIcon={Rocket} data={data.production} />
			)}
		</div>
	)
}

// === Data-driven variant for sandbox / dev routes ===

interface SekiPipelineMonitorDataProps {
	data: { staging: SekiPipelineData | null; production: SekiPipelineData | null }
}

export function SekiPipelineMonitorData({ data }: SekiPipelineMonitorDataProps) {
	if (!data.staging && !data.production) return null

	return (
		<div className="space-y-3">
			{data.staging && (
				<EnvCard envLabel="Staging" envIcon={FlaskConical} data={data.staging} />
			)}
			{data.production && (
				<EnvCard envLabel="Production" envIcon={Rocket} data={data.production} />
			)}
		</div>
	)
}
