import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ChevronDown, ChevronRight, CircleAlert, CircleDot } from "lucide-react"
import { applyCachePolicy } from "@/lib/queryKeys"
import type { PodHealthInfo } from "@/api/kubectl"
import type { DeploymentWithContext } from "./DeploymentList"
import { useCommitStatus } from "@/hooks/useCommitStatus"
import { BaseDialog } from "@/components/ui/BaseDialog"

export interface NamespaceHealthIssue {
	type: 'crashloop' | 'not-ready' | 'oomkilled' | 'imagepull' | 'restarts' | 'old-image' | 'commit-behind'
	label: string
	count: number
	detail?: string[]
}

const ISSUE_ICONS: Record<NamespaceHealthIssue['type'], typeof AlertTriangle> = {
	crashloop: AlertTriangle,
	'not-ready': AlertTriangle,
	oomkilled: AlertTriangle,
	imagepull: AlertTriangle,
	restarts: AlertTriangle,
	'old-image': CircleDot,
	'commit-behind': CircleDot,
}

const ISSUE_COLORS: Record<NamespaceHealthIssue['type'], string> = {
	crashloop: 'text-destructive',
	'not-ready': 'text-warning',
	oomkilled: 'text-destructive',
	imagepull: 'text-destructive',
	restarts: 'text-warning',
	'old-image': 'text-warning',
	'commit-behind': 'text-warning',
}

const RESTART_THRESHOLD = 3

const REASON_LABELS: Record<string, string> = {
	'OOMKilled': 'Memoria agotada',
	'Error': 'Error',
	'Completed': 'Completado',
	'ContainerCannotRun': 'Container no ejecuta',
	'CreateContainerConfigError': 'Error de config',
	'CreateContainerError': 'Error al crear container',
	'InvalidImageName': 'Nombre de imagen inválido',
	'CrashLoopBackOff': 'Crash loop',
	'RunContainerError': 'Error al ejecutar container',
	'DeadlineExceeded': 'Timeout excedido',
	'Evicted': 'Evictado',
}

const EXIT_CODE_LABELS: Record<number, string> = {
	0: 'OK',
	1: 'Error general',
	2: 'Uso incorrecto',
	126: 'No ejecutable',
	127: 'Comando no encontrado',
	128: 'Argumento inválido',
	134: 'SIGABRT',
	137: 'SIGKILL',
	139: 'SIGSEGV',
	143: 'SIGTERM',
}

function formatReason(reason?: string): string {
	if (!reason) return 'desconocido'
	return REASON_LABELS[reason] || reason
}

function formatExitCode(code?: number): string {
	if (code === undefined) return ''
	return EXIT_CODE_LABELS[code] || `exit ${code}`
}

function formatRelative(isoDate?: string): string {
	if (!isoDate) return ''
	const diff = Date.now() - new Date(isoDate).getTime()
	if (diff < 0) return ''
	const mins = Math.floor(diff / 60000)
	if (mins < 1) return 'hace un momento'
	if (mins < 60) return `hace ${mins}m`
	const hours = Math.floor(mins / 60)
	if (hours < 24) return `hace ${hours}h`
	const days = Math.floor(hours / 24)
	return `hace ${days}d`
}

/**
 * Analyzes pods in a namespace and returns health issues.
 * Categories: CrashLoop, OOMKilled, ImagePullBackOff, NotReady, high restarts.
 */
function analyzePods(pods: PodHealthInfo[]): NamespaceHealthIssue[] {
	const issues: NamespaceHealthIssue[] = []

	const crashloop = pods.filter(p => p.phase === 'CrashLoopBackOff')
	if (crashloop.length > 0) {
		issues.push({
			type: 'crashloop', label: 'Crash loop', count: crashloop.length,
			detail: crashloop.map(p => {
				const c = p.containers[0]
				const reason = formatReason(c?.stateReason || c?.lastStateReason)
				const exit = formatExitCode(c?.lastStateExitCode)
				return `${p.name}: ${reason}${exit ? ' (' + exit + ')' : ''}`
			}),
		})
	}

	const oomkilled = pods.filter(p => p.containers.some(c => c.lastStateReason === 'OOMKilled' || c.stateReason === 'OOMKilled'))
	if (oomkilled.length > 0) {
		issues.push({
			type: 'oomkilled', label: 'Memoria agotada', count: oomkilled.length,
			detail: oomkilled.map(p => {
				const c = p.containers.find(c => c.lastStateReason === 'OOMKilled' || c.stateReason === 'OOMKilled')
				const last = formatRelative(c?.lastStateFinishedAt)
				return `${p.name}: memoria agotada${last ? ' · último ' + last : ''}`
			}),
		})
	}

	const imagepull = pods.filter(p => p.phase === 'ImagePullBackOff' || p.phase === 'ErrImagePull')
	if (imagepull.length > 0) {
		issues.push({
			type: 'imagepull', label: 'Imagen no encontrada', count: imagepull.length,
			detail: imagepull.map(p => {
				const c = p.containers[0]
				const msg = c?.stateMessage ? ' · ' + c.stateMessage : ''
				return `${p.name}: ${formatReason(p.phase)}${msg}`
			}),
		})
	}

	const notReady = pods.filter(p => {
		if (p.phase !== 'Running') return false
		const [ready, total] = p.ready.split('/')
		return ready !== total
	})
	if (notReady.length > 0) {
		issues.push({
			type: 'not-ready', label: 'No listo', count: notReady.length,
			detail: notReady.map(p => {
				const c = p.containers.find(c => !c.ready)
				const reason = c?.stateReason ? ' · ' + formatReason(c.stateReason) : ''
				return `${p.name}: ready ${p.ready}${reason}`
			}),
		})
	}

	const highRestarts = pods.filter(p => p.restarts >= RESTART_THRESHOLD)
	if (highRestarts.length > 0) {
		issues.push({
			type: 'restarts', label: 'Restarts altos', count: highRestarts.length,
			detail: highRestarts.map(p => {
				const c = p.containers[0]
				const reason = formatReason(c?.lastStateReason)
				const exit = formatExitCode(c?.lastStateExitCode)
				const last = formatRelative(c?.lastStateFinishedAt)
				return `${p.name}: ${p.restarts} restarts · ${reason}${exit ? ' (' + exit + ')' : ''}${last ? ' · último ' + last : ''}`
			}),
		})
	}

	return issues
}

/**
 * Hook that aggregates pod health for a namespace.
 * Fetches pods via kubectl get pods -o json and analyzes them.
 */
function usePodHealth(namespace: string, context: string, enabled: boolean) {
	return useQuery({
		queryKey: ['kubectl', 'pod-health', context, namespace],
		queryFn: async () => {
			const { getPodHealthForNamespace } = await import('@/api/kubectl')
			const pods = await getPodHealthForNamespace(namespace, context)
			return analyzePods(pods)
		},
		enabled,
		...applyCachePolicy('kubectl'),
		staleTime: 60 * 1000,
	})
}

/**
 * Hook that checks commit status for all deployments in a namespace.
 * Returns a single commit-behind issue aggregating all deployments that are behind.
 */
function useCommitHealth(deployments: DeploymentWithContext[], enabled: boolean) {
	const commits = useMemo(() => {
		return deployments
			.filter(d => d.gitCommit && !d.isPlaceholder)
			.map(d => ({ name: d.name, sha: d.gitCommit! }))
	}, [deployments])

	const results = commits.map(c => useCommitStatus(c.sha, enabled))

	return useMemo(() => {
		const behind = results
			.map((r, i) => ({ ...r, name: commits[i].name }))
			.filter(r => r.status === 'behind')

		if (behind.length === 0) return null

		return {
			type: 'commit-behind' as const,
			label: 'Commit atrasado',
			count: behind.length,
			detail: behind.map(r => r.name + ': ' + r.behindBy + ' commits detrás de HEAD'),
		} satisfies NamespaceHealthIssue
	}, [results, commits])
}

/**
 * Hook that returns all health issues for a namespace/context.
 * Can be used by both the header indicator and the modal.
 */
export function useNamespaceHealth(namespace: string, context: string, deployments: DeploymentWithContext[]) {
	const enabled = !!context && !!namespace
	const { data: podIssues, isLoading } = usePodHealth(namespace, context, enabled)
	const commitIssue = useCommitHealth(deployments, enabled)

	return useMemo(() => {
		const all: NamespaceHealthIssue[] = []
		if (podIssues && podIssues.length > 0) all.push(...podIssues)
		if (commitIssue) all.push(commitIssue)
		return { issues: all, isLoading }
	}, [podIssues, commitIssue, isLoading])
}

/**
 * Health indicator for the table header.
 * Shows an emoji if there are issues, opens the modal on click.
 * Returns null if no issues.
 */
export function NamespaceHealthIndicator({
	namespace,
	context,
	deployments,
}: {
	namespace: string
	context: string
	deployments: DeploymentWithContext[]
}) {
	const [isOpen, setIsOpen] = useState(false)
	const { issues } = useNamespaceHealth(namespace, context, deployments)

	if (issues.length === 0) return null

	const totalProblems = issues.reduce((acc, i) => acc + i.count, 0)
	const hasCritical = issues.some(i => ISSUE_COLORS[i.type] === 'text-destructive')
	const Icon = hasCritical ? AlertTriangle : CircleAlert
	const iconClass = hasCritical ? 'text-destructive' : 'text-warning'

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none rounded"
				title={`${totalProblems} ${totalProblems === 1 ? 'problema' : 'problemas'} — click para ver detalle`}
			>
				<Icon className={"w-3.5 h-3.5 " + iconClass} />
				<span className="text-muted-foreground">{totalProblems}</span>
			</button>
			<NamespaceHealthModal
				open={isOpen}
				onOpenChange={setIsOpen}
				namespace={namespace}
				context={context}
				issues={issues}
			/>
		</>
	)
}

function NamespaceHealthModal({
	open,
	onOpenChange,
	namespace,
	context,
	issues,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	namespace: string
	context: string
	issues: NamespaceHealthIssue[]
}) {
	const [expandedIssue, setExpandedIssue] = useState<number | null>(null)
	const totalProblems = issues.reduce((acc, i) => acc + i.count, 0)
	const hasCritical = issues.some(i => ISSUE_COLORS[i.type] === 'text-destructive')

	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title={
				<span className="flex items-center gap-2">
					{hasCritical
						? <AlertTriangle className="w-4 h-4 text-destructive" />
						: <CircleAlert className="w-4 h-4 text-warning" />}
					<span>{namespace}</span>
					<span className="text-xs font-normal text-muted-foreground">{context}</span>
				</span>
			}
			description={`Salud del namespace ${namespace} en ${context}`}
			maxWidth="max-w-xl"
		>
			<div className="flex flex-col gap-3 overflow-y-auto px-2 pb-2">
				<div className="text-sm text-muted-foreground">
					{totalProblems} {totalProblems === 1 ? 'problema' : 'problemas'} detectados
				</div>
				{issues.map((issue, idx) => {
					const Icon = ISSUE_ICONS[issue.type]
					const color = ISSUE_COLORS[issue.type]
					const isExpanded = expandedIssue === idx
					return (
						<div key={idx} className="border border-border rounded-md">
							<button
								type="button"
								onClick={() => setExpandedIssue(isExpanded ? null : idx)}
								className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none rounded-md"
							>
								<Icon className={"w-4 h-4 shrink-0 " + color} />
								<span className={"text-sm font-medium " + color}>{issue.label}</span>
								<span className="text-xs text-muted-foreground">· {issue.count}</span>
								{issue.detail && issue.detail.length > 0 && (
									isExpanded
										? <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
										: <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
								)}
							</button>
							{isExpanded && issue.detail && issue.detail.length > 0 && (
								<div className="flex flex-col gap-0.5 px-3 pb-2 pl-10">
									{issue.detail.map((d, i) => (
										<span key={i} className="text-xs text-muted-foreground font-mono">{d}</span>
									))}
								</div>
							)}
						</div>
					)
				})}
			</div>
		</BaseDialog>
	)
}
