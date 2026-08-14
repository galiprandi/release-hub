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
	Server,
	Globe,
	Bell,
	Box,
	Wand2,
} from 'lucide-react'
import { useAIPrompt } from '@galiprandi/react-tools'
import DayJS from '@/lib/dayjs'
import { useSekiPipelinesByEnv } from '../hooks/useSekiPipelinesByEnv'
import { sekiAdapter } from '../adapter'
import type { SekiPipelineData, SekiPipelineState, SekiStage, SekiPipelineEvent } from '../types'
import { BaseDialog } from '@/components/ui/BaseDialog'
import { CopyButton } from '@/components/shared/CopyButton'
import { MarkdownLog } from '@/components/shared/MarkdownLog'

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

/** Prompt para filtrar y explicar el error concreto del log completo */
const LOG_EXPLAIN_SYSTEM_PROMPT = `Sos un DevOps Engineer senior especializado en Kubernetes y CI/CD. Recibís el log crudo de un pipeline fallido y debés filtrar el ruido para explicar el error concreto.

Reglas:
- Hablá en español, directo y técnico.
- Ignorá las líneas que sean output normal (logs de app funcionando, "secrets generated", etc).
- Enfocate SOLO en lo que causó el fallo.
- Cité la línea exacta del log entre comillas.
- Sé conciso: máximo 4 líneas.
- En ACCION sugerí SIEMPRE comandos concretos de kubectl (o docker/helm/gcloud si aplica) para debugear o fixear el problema. Incluí namespace, selector o nombre del pod extraídos del log. Si hay que investigar más, dajá el comando para obtener info adicional.

Formato de salida (sin markdown):
ERROR: <tipo de error en una frase>
EVIDENCIA: "<línea exacta del log>"
CAUSA: <por qué pasó, en una frase>
ACCION: <comando kubectl/docker/helm concreto para debug o fix, con namespace y selector del log>`

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

/** Hook para filtrar y explicar el error concreto del log completo con IA */
function useLogExplain(errorMarkdown: string | undefined, aiAvailable: boolean) {
	const { data, status, error, prompt, reset } = useAIPrompt({
		initialPrompts: [{ role: 'system', content: LOG_EXPLAIN_SYSTEM_PROMPT }],
		streaming: true,
		warmup: false,
	})

	const isGenerating = status === 'prompting' || status === 'initializing' || status === 'downloading'
	const hasResult = !!data && !isGenerating

	let errorLine: string | null = null
	let evidence: string | null = null
	let cause: string | null = null
	let action: string | null = null
	if (hasResult) {
		for (const line of data.split('\n').map((l) => l.trim()).filter(Boolean)) {
			const errMatch = line.match(/^ERROR\s*[:：]\s*(.+)/i)
			const evMatch = line.match(/^EVIDENCIA\s*[:：]\s*(.+)/i)
			const causeMatch = line.match(/^CAUSA\s*[:：]\s*(.+)/i)
			const actMatch = line.match(/^ACCION\s*[:：]\s*(.+)/i)
			if (errMatch) errorLine = errMatch[1].trim()
			else if (evMatch) evidence = evMatch[1].trim()
			else if (causeMatch) cause = causeMatch[1].trim()
			else if (actMatch) action = actMatch[1].trim()
		}
	}

	const trigger = useCallback(() => {
		if (errorMarkdown && aiAvailable) prompt(errorMarkdown)
	}, [errorMarkdown, aiAvailable, prompt])

	const regenerate = useCallback(() => {
		reset()
		if (errorMarkdown && aiAvailable) prompt(errorMarkdown)
	}, [errorMarkdown, aiAvailable, prompt, reset])

	return {
		errorLine,
		evidence,
		cause,
		action,
		isGenerating,
		hasResult,
		error: error?.message || null,
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
	const hasRunning = filteredSubs.some((s) => s.state === 'RUNNING' || s.state === 'STARTED')
	const allIdle = filteredSubs.length > 0 && filteredSubs.every((s) => s.state === 'IDLE')
	const allCompleted = filteredSubs.length > 0 && filteredSubs.every((s) => s.state === 'COMPLETED' || s.state === 'SUCCESS')
	let newState: SekiPipelineState
	if (hasFail) {
		newState = 'FAILED'
	} else if (hasRunning) {
		newState = 'RUNNING'
	} else if (hasWarn) {
		newState = 'WARN'
	} else if (allIdle || stage.state === 'IDLE') {
		newState = 'IDLE'
	} else if (stage.state === 'RUNNING' || stage.state === 'STARTED') {
		newState = 'RUNNING'
	} else if (allCompleted) {
		newState = 'COMPLETED'
	} else {
		newState = stage.state
	}
	return { ...stage, subevents: filteredSubs, state: newState }
}

function filterPipelineData(data: SekiPipelineData): SekiPipelineData {
	if (!data.stages) return data
	const filteredStages = data.stages.map(filterStage)
	const hasFail = filteredStages.some((s) => s.state === 'FAILED')
	const hasWarn = filteredStages.some((s) => s.state === 'WARN')
	const hasRunning = filteredStages.some((s) => s.state === 'RUNNING' || s.state === 'STARTED')
	const hasIdle = filteredStages.some((s) => s.state === 'IDLE')
	const allCompleted = filteredStages.length > 0 && filteredStages.every((s) => s.state === 'COMPLETED' || s.state === 'SUCCESS')
	let newState: SekiPipelineState
	if (hasFail) {
		newState = 'FAILED'
	} else if (hasRunning) {
		newState = 'RUNNING'
	} else if (hasWarn) {
		newState = 'WARN'
	} else if (hasIdle) {
		newState = data.state === 'STARTED' || data.state === 'RUNNING' ? 'RUNNING' : 'IDLE'
	} else if (allCompleted) {
		newState = 'COMPLETED'
	} else {
		newState = data.state
	}
	const errorSubs = filteredStages
		.flatMap((s) => s.subevents)
		.filter((s) => (s.state === 'FAILED' || s.state === 'WARN') && s.markdown)
	const newErrorMarkdown = errorSubs.length > 0
		? errorSubs.map((s) => s.markdown).join('\n\n---\n\n')
		: undefined
	return { ...data, stages: filteredStages, state: newState, errorMarkdown: newErrorMarkdown }
}

// === Status helpers ===

function statusConfig(state: SekiPipelineState) {
	switch (state) {
		case 'COMPLETED':
		case 'SUCCESS':
			return {
				icon: CheckCircle2,
				color: 'text-success',
				bg: 'bg-success',
				badge: 'bg-success/15 text-success border border-success/30',
				label: 'OK',
			}
		case 'FAILED':
			return {
				icon: XCircle,
				color: 'text-destructive',
				bg: 'bg-destructive',
				badge: 'bg-destructive/15 text-destructive border border-destructive/30',
				label: 'FALLÓ',
			}
		case 'WARN':
			return {
				icon: AlertTriangle,
				color: 'text-warning',
				bg: 'bg-warning',
				badge: 'bg-warning/15 text-warning border border-warning/30',
				label: 'WARN',
			}
		case 'RUNNING':
		case 'STARTED':
			return {
				icon: Loader2,
				color: 'text-primary',
				bg: 'bg-primary animate-pulse',
				badge: 'bg-primary/15 text-primary border border-primary/30',
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

/** Mapea el prefijo del label de un subevent a un icono representativo */
function getSubeventKindIcon(label: string): { icon: typeof Server; kind: string } | null {
	const lower = label.toLowerCase()
	if (lower.startsWith('api:')) return { icon: Server, kind: 'api' }
	if (lower.startsWith('web:')) return { icon: Globe, kind: 'web' }
	if (lower.startsWith('subscriber:')) return { icon: Bell, kind: 'subscriber' }
	if (lower.startsWith('golden:')) return { icon: Box, kind: 'golden' }
	if (lower.startsWith('validation:')) return { icon: CheckCircle2, kind: 'validation' }
	if (lower.startsWith('workspace:')) return { icon: Box, kind: 'workspace' }
	if (lower.startsWith('google_bucket:')) return { icon: Box, kind: 'google_bucket' }
	if (lower.startsWith('kafka:')) return { icon: Box, kind: 'kafka' }
	if (lower.startsWith('mongodb:')) return { icon: Box, kind: 'mongodb' }
	if (lower.startsWith('redis:')) return { icon: Box, kind: 'redis' }
	if (lower.startsWith('cgt:')) return { icon: AlertTriangle, kind: 'cgt' }
	if (lower.startsWith('jira:')) return { icon: AlertTriangle, kind: 'jira' }
	return null
}

/** Extrae el nombre del subevent sin el prefijo "api:", "web:", etc. */
function stripPrefix(label: string): string {
	const idx = label.indexOf(':')
	return idx >= 0 ? label.slice(idx + 1).trim() : label
}

function SubeventRow({ sub }: { sub: SekiPipelineEvent }) {
	const config = statusConfig(sub.state)
	const Icon = config.icon
	const duration = formatDuration(sub.startedAt, sub.completedAt)
	const rawLabel = sub.label || sub.name || ''
	const kindInfo = getSubeventKindIcon(rawLabel)
	const cleanLabel = kindInfo ? stripPrefix(rawLabel) : rawLabel

	return (
		<div className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-muted/30 transition-colors">
			<div className="flex items-center gap-2 min-w-0">
				<Icon className={`w-3 h-3 shrink-0 ${config.color} ${sub.state === 'RUNNING' || sub.state === 'STARTED' ? 'animate-spin' : ''}`} />
				{kindInfo && (
					<kindInfo.icon className="w-3 h-3 shrink-0 text-muted-foreground" />
				)}
				<span className="text-xs text-foreground truncate">{cleanLabel}</span>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{sub.deployUrl && (
					<a
						href={sub.deployUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-0.5 transition-colors"
						onClick={(e) => e.stopPropagation()}
					>
						<ExternalLink className="w-2.5 h-2.5" />
						url
					</a>
				)}
				{duration && <span className="text-xs text-muted-foreground tabular-nums">{duration}</span>}
			</div>
		</div>
	)
}

// === Deploy URL chip with copy-to-clipboard ===

function DeployUrlChip({ label, url }: { label: string; url: string }) {
	const kindInfo = getSubeventKindIcon(label)
	const cleanLabel = kindInfo ? stripPrefix(label) : label

	return (
		<span className="group inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/15 border border-primary/30 rounded-md hover:bg-primary/15 transition-colors">
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1"
				onClick={(e) => e.stopPropagation()}
			>
				{kindInfo && <kindInfo.icon className="w-3 h-3 shrink-0" />}
				{cleanLabel}
				<ExternalLink className="w-2.5 h-2.5" />
			</a>
			<CopyButton
				text={url}
				className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity p-0.5 w-auto h-auto"
				tooltip="Copiar URL"
				copiedTooltip="¡Copiado!"
			/>
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
		<div className="border border-border rounded-lg overflow-hidden bg-card">
			<div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
				<div className="flex items-center gap-2">
					<config.icon className={`w-4 h-4 ${config.color}`} />
					<span className="text-xs font-bold text-foreground">{stage.label}</span>
					<span className={`px-1.5 py-0 text-xs rounded ${config.badge}`}>
						{config.label}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{hasError && ai.hasResult && !ai.isGenerating && !ai.isFallback && (
						<button
							type="button"
							onClick={ai.regenerate}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							title="Regenerar análisis"
						>
							↻
						</button>
					)}
					{hasError && (
						<button
							type="button"
							onClick={onOpenLog}
							className="text-xs font-bold underline hover:opacity-70 transition-opacity"
						>
							Ver log
						</button>
					)}
					{duration && (
						<span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
							<Clock className="w-2.5 h-2.5" />
							{duration}
						</span>
					)}
				</div>
			</div>

			<div className="p-2 space-y-0.5 max-h-[280px] overflow-y-auto">
				{stage.subevents.map((sub) => (
					<SubeventRow key={sub.id} sub={sub} />
				))}
			</div>

			{hasError && (
				<div className="px-3 py-3 border-t border-border bg-destructive/5 space-y-2.5">
					<div className="flex items-center gap-2">
						{ai.isGenerating ? (
							<Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-purple-500 dark:text-purple-400" />
						) : ai.isFallback ? (
							<AlertCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
						) : ai.hasResult ? (
							<Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
						) : (
							<AlertCircle className="w-3.5 h-3.5 shrink-0 text-destructive" />
						)}
						{ai.isGenerating && (
							<span className="text-xs text-muted-foreground italic">Analizando con IA...</span>
						)}
						{ai.isFallback && !ai.hasResult && (
							<span className="text-xs text-muted-foreground italic">IA no disponible</span>
						)}
						{ai.error && !ai.isGenerating && !ai.isFallback && (
							<span className="text-xs text-muted-foreground">{ai.error}</span>
						)}
					</div>

					{!ai.isGenerating && ai.hasResult && (ai.diagnosis || ai.command || ai.correction) && (
						<div className="space-y-2">
							{ai.diagnosis && (
								<div className="space-y-0.5">
									<span className="text-xs font-medium text-destructive dark:text-destructive">
										Diagnóstico
									</span>
									<p className="text-xs text-foreground font-medium leading-relaxed">{ai.diagnosis}</p>
								</div>
							)}
							{ai.command && (
								<div className="space-y-0.5">
									<span className="text-xs font-medium text-muted-foreground">
										Comando
									</span>
									<code className="block text-xs font-mono text-primary bg-primary/15 px-2 py-1.5 rounded break-all">
										{ai.command}
									</code>
								</div>
							)}
							{ai.correction && (
								<div className="space-y-0.5">
									<span className="text-xs font-medium text-success">
										Corrección
									</span>
									<p className="text-xs text-foreground leading-relaxed">{ai.correction}</p>
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
	envColor: string
	data: SekiPipelineData
}

function EnvCard({ envLabel, envIcon: EnvIcon, envColor, data }: EnvCardProps) {
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

	const logExplain = useLogExplain(filteredData.errorMarkdown, aiAvailable)

	const expandedStage = expandedStageId ? stages.find((s) => s.id === expandedStageId) : null

	const handleStageClick = (stageId: string) => {
		setExpandedStageId(expandedStageId === stageId ? null : stageId)
	}

	return (
		<div className={`bg-card border rounded-md p-4 transition-all duration-500 ${
			filteredData.state === 'FAILED' ? 'ring-1 ring-destructive/20' : ''
		} ${
			filteredData.state === 'WARN' ? 'ring-1 ring-warning/20' : ''
		}`}>
			<div className="flex items-start gap-3">
				<div className={`w-1 rounded-full self-stretch ${config.bg}`} />
				<div className="flex-1 min-w-0 space-y-2">

					{/* Header: ref + status + env */}
					<div className="flex items-center gap-2 flex-wrap">
						<RefTypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
						<span className="font-mono text-sm font-semibold text-foreground">{filteredData.ref}</span>
						<span className={`px-1.5 py-0 text-xs rounded ${
							filteredData.refType === 'TAG'
								? 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
								: 'bg-primary/15 text-primary border border-primary/30'
						}`}>
							{filteredData.refType}
						</span>
						<span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${config.badge}`}>
							<StatusIcon className={`w-3 h-3 ${config.color} ${filteredData.state === 'RUNNING' || filteredData.state === 'STARTED' ? 'animate-spin' : ''}`} />
							{config.label}
						</span>
						<div className="flex items-center gap-1 ml-auto">
							<EnvIcon className={`w-3.5 h-3.5 ${envColor}`} />
							<span className={`text-xs font-medium ${envColor}`}>
								{envLabel}
							</span>
						</div>
					</div>

					{/* Meta: author · time · duration */}
					<div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
						{filteredData.commit?.author && (
							<span className="font-medium text-foreground truncate max-w-[200px]">{filteredData.commit.author}</span>
						)}
						<span className="text-muted-foreground">·</span>
						<span>{lastUpdated}</span>
						{totalDuration && (
							<>
								<span className="text-muted-foreground">·</span>
								<span className="inline-flex items-center gap-1 tabular-nums">
									<Clock className="w-2.5 h-2.5" />
									{totalDuration}
								</span>
							</>
						)}
					</div>
					{filteredData.commit?.message && (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<GitCommit className="w-3 h-3 shrink-0" />
							<span className="truncate">{filteredData.commit.message}</span>
						</div>
					)}

					{/* Deploy URLs (with copy-to-clipboard) */}
					{deploySubs.length > 0 && (
						<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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
											className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
												isExpanded
													? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
													: isFailed
														? `${stageConfig.badge} hover:scale-105`
														: 'text-muted-foreground border border-border hover:bg-muted/30'
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
								<span className="text-xs font-medium text-muted-foreground">
									Stages con problemas ({failedStages.length})
								</span>
								{failedStages.map((stage) => (
									<div key={stage.id} className="border border-border rounded-lg overflow-hidden bg-card">
										<div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
											<span className="text-xs font-bold text-foreground">{stage.label}</span>
										</div>
										<div className="p-2 space-y-0.5 max-h-[280px] overflow-y-auto">
											{stage.subevents.map((sub) => (
												<SubeventRow key={sub.id} sub={sub} />
											))}
										</div>
									</div>
								))}
							</div>
						)}
						<div className="mt-4">
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-medium text-muted-foreground">
									Log completo
								</span>
								<div className="flex items-center gap-1.5">
									<CopyButton
										text={filteredData.errorMarkdown}
										className="opacity-100 p-1 w-auto h-auto"
										tooltip="Copiar log"
										copiedTooltip="¡Log copiado!"
									/>
									{aiAvailable && !logExplain.hasResult && !logExplain.isGenerating && (
										<button
											type="button"
											onClick={logExplain.trigger}
											className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
										>
											<Wand2 className="w-3 h-3" />
											Explicar error con IA
										</button>
									)}
									{logExplain.hasResult && !logExplain.isGenerating && (
										<button
											type="button"
											onClick={logExplain.regenerate}
											className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
											title="Regenerar análisis"
										>
											↻
										</button>
									)}
								</div>
							</div>

							{/* AI explanation panel */}
							{logExplain.isGenerating && (
								<div className="mb-3 flex items-center gap-2 px-3 py-2.5 rounded-md bg-primary/10 border border-primary/30">
									<Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-primary" />
									<span className="text-xs text-muted-foreground italic">Filtrando error con IA...</span>
								</div>
							)}
							{!logExplain.isGenerating && logExplain.hasResult && (logExplain.errorLine || logExplain.evidence || logExplain.cause || logExplain.action) && (
								<div className="mb-3 px-3 py-3 rounded-md bg-destructive/5 border border-destructive/30 space-y-2">
									<div className="flex items-center gap-1.5">
										<Sparkles className="w-3.5 h-3.5 shrink-0 text-primary" />
										<span className="text-xs font-medium text-foreground">Análisis del error</span>
									</div>
									{logExplain.errorLine && (
										<div className="space-y-0.5">
											<span className="text-xs font-medium text-destructive">Error</span>
											<p className="text-xs text-foreground font-medium leading-relaxed">{logExplain.errorLine}</p>
										</div>
									)}
									{logExplain.evidence && (
										<div className="space-y-0.5">
											<span className="text-xs font-medium text-muted-foreground">Evidencia</span>
											<p className="text-xs text-foreground font-mono leading-relaxed bg-muted/30 px-2 py-1 rounded">{logExplain.evidence}</p>
										</div>
									)}
									{logExplain.cause && (
										<div className="space-y-0.5">
											<span className="text-xs font-medium text-muted-foreground">Causa</span>
											<p className="text-xs text-foreground leading-relaxed">{logExplain.cause}</p>
										</div>
									)}
									{logExplain.action && (
										<div className="space-y-0.5">
											<span className="text-xs font-medium text-success">Acción</span>
											<p className="text-xs text-foreground leading-relaxed">{logExplain.action}</p>
										</div>
									)}
								</div>
							)}
							{logExplain.error && !logExplain.isGenerating && !logExplain.hasResult && (
								<div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border">
									<AlertCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
									<span className="text-xs text-muted-foreground">{logExplain.error}</span>
								</div>
							)}

							<div className="text-foreground bg-card p-4 rounded-lg border overflow-x-auto">
								<MarkdownLog content={filteredData.errorMarkdown} />
							</div>
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
				<EnvCard envLabel="Staging" envIcon={FlaskConical} envColor="text-primary" data={data.staging} />
			)}
			{data.production && (
				<EnvCard envLabel="Production" envIcon={Rocket} envColor="text-purple-700 dark:text-purple-300" data={data.production} />
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
				<EnvCard envLabel="Staging" envIcon={FlaskConical} envColor="text-primary" data={data.staging} />
			)}
			{data.production && (
				<EnvCard envLabel="Production" envIcon={Rocket} envColor="text-purple-700 dark:text-purple-300" data={data.production} />
			)}
		</div>
	)
}
