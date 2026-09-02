import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ChevronDown, ChevronRight, CircleAlert, CircleDot, Search, Terminal, FileText, CheckCircle2 } from "lucide-react"
import { applyCachePolicy } from "@/lib/queryKeys"
import type { PodHealthInfo } from "@/api/kubectl"
import type { DeploymentInfo } from "@/api/kubectl"
import type { DeploymentWithContext } from "./DeploymentList"
import { useCommitStatus } from "@/hooks/useCommitStatus"
import { BaseDialog } from "@/components/ui/BaseDialog"

export interface NamespaceHealthIssue {
	type: 'crashloop' | 'not-ready' | 'oomkilled' | 'imagepull' | 'restarts' | 'old-image' | 'commit-behind'
	label: string
	count: number
	pods?: PodGroup[]
	deployments?: { name: string; behindBy: number }[]
}

interface PodGroup {
	deploymentName: string
	pods: PodHealthInfo[]
	totalRestarts: number
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

const ISSUE_PRIORITY: Record<NamespaceHealthIssue['type'], number> = {
	crashloop: 0,
	oomkilled: 1,
	imagepull: 2,
	'not-ready': 3,
	restarts: 4,
	'old-image': 5,
	'commit-behind': 6,
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

function getDeploymentName(podName: string): string {
	const match = podName.match(/^(.+)-[a-f0-9]{6,10}-[a-z0-9]{4,10}$/)
	if (match) return match[1]
	const match2 = podName.match(/^(.+)-[a-f0-9]+$/)
	if (match2) return match2[1]
	return podName
}

function groupPodsByDeployment(pods: PodHealthInfo[]): PodGroup[] {
	const groups: Record<string, PodHealthInfo[]> = {}
	for (const pod of pods) {
		const depName = getDeploymentName(pod.name)
		if (!groups[depName]) groups[depName] = []
		groups[depName].push(pod)
	}
	return Object.entries(groups).map(([deploymentName, pods]) => ({
		deploymentName,
		pods: pods.sort((a, b) => b.restarts - a.restarts),
		totalRestarts: pods.reduce((acc, p) => acc + p.restarts, 0),
	})).sort((a, b) => b.totalRestarts - a.totalRestarts)
}

function formatRestartPattern(pod: PodHealthInfo): string {
	if (!pod.createdAt || pod.restarts === 0) return ''
	const ageMs = Date.now() - new Date(pod.createdAt).getTime()
	if (ageMs <= 0) return ''
	const ageHours = ageMs / (1000 * 60 * 60)
	if (ageHours < 1) return ''
	const interval = ageHours / pod.restarts
	if (interval < 1) {
		const mins = Math.round(interval * 60)
		return `cada ~${mins}m`
	}
	return `cada ~${interval.toFixed(1)}h`
}

/**
 * Analyzes pods in a namespace and returns health issues.
 * Pods are grouped by deployment, sorted by severity.
 */
function analyzePods(pods: PodHealthInfo[]): NamespaceHealthIssue[] {
	const issues: NamespaceHealthIssue[] = []

	const crashloopPods = pods.filter(p => p.phase === 'CrashLoopBackOff')
	if (crashloopPods.length > 0) {
		issues.push({
			type: 'crashloop', label: 'Crash loop', count: crashloopPods.length,
			pods: groupPodsByDeployment(crashloopPods),
		})
	}

	const oomkilledPods = pods.filter(p => (p.containers || []).some(c => c.lastStateReason === 'OOMKilled' || c.stateReason === 'OOMKilled'))
	if (oomkilledPods.length > 0) {
		issues.push({
			type: 'oomkilled', label: 'Memoria agotada', count: oomkilledPods.length,
			pods: groupPodsByDeployment(oomkilledPods),
		})
	}

	const imagepullPods = pods.filter(p => p.phase === 'ImagePullBackOff' || p.phase === 'ErrImagePull')
	if (imagepullPods.length > 0) {
		issues.push({
			type: 'imagepull', label: 'Imagen no encontrada', count: imagepullPods.length,
			pods: groupPodsByDeployment(imagepullPods),
		})
	}

	const notReadyPods = pods.filter(p => {
		if (p.phase !== 'Running') return false
		if (!p.ready) return false
		const [ready, total] = p.ready.split('/')
		return ready !== total
	})
	if (notReadyPods.length > 0) {
		issues.push({
			type: 'not-ready', label: 'No listo', count: notReadyPods.length,
			pods: groupPodsByDeployment(notReadyPods),
		})
	}

	const highRestartPods = pods.filter(p => p.restarts >= RESTART_THRESHOLD)
	if (highRestartPods.length > 0) {
		issues.push({
			type: 'restarts', label: 'Restarts altos', count: highRestartPods.length,
			pods: groupPodsByDeployment(highRestartPods),
		})
	}

	return issues.sort((a, b) => ISSUE_PRIORITY[a.type] - ISSUE_PRIORITY[b.type])
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
			deployments: behind.map(r => ({ name: r.name, behindBy: r.behindBy })),
		} satisfies NamespaceHealthIssue
	}, [results, commits])
}

/**
 * Hook that returns all health issues for a namespace/context.
 */
export function useNamespaceHealth(namespace: string, context: string, deployments: DeploymentWithContext[]) {
	const enabled = !!context && !!namespace
	const { data: podIssues, isLoading } = usePodHealth(namespace, context, enabled)
	const commitIssue = useCommitHealth(deployments, enabled)

	return useMemo(() => {
		const all: NamespaceHealthIssue[] = []
		if (podIssues && podIssues.length > 0) all.push(...podIssues)
		if (commitIssue) all.push(commitIssue)
		return { issues: all.sort((a, b) => ISSUE_PRIORITY[a.type] - ISSUE_PRIORITY[b.type]), isLoading }
	}, [podIssues, commitIssue, isLoading])
}

/**
 * Health indicator for the table header.
 * Shows an icon if there are issues, opens the modal on click.
 * Returns null if no issues.
 */
export function NamespaceHealthIndicator({
	namespace,
	context,
	deployments,
	onViewLogs,
	onOpenTerminal,
}: {
	namespace: string
	context: string
	deployments: DeploymentWithContext[]
	onViewLogs?: (deployment: DeploymentInfo, context: string) => void
	onOpenTerminal?: (deployment: DeploymentInfo, context: string) => void
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
				onViewLogs={onViewLogs}
				onOpenTerminal={onOpenTerminal}
			/>
		</>
	)
}

function PodRow({
	pod,
	onViewLogs,
	onOpenTerminal,
	deploymentName,
}: {
	pod: PodHealthInfo
	onViewLogs?: (deployment: DeploymentInfo, context: string) => void
	onOpenTerminal?: (deployment: DeploymentInfo, context: string) => void
	deploymentName: string
}) {
	const c = (pod.containers || [])[0]
	const reason = formatReason(c?.lastStateReason)
	const exit = formatExitCode(c?.lastStateExitCode)
	const last = formatRelative(c?.lastStateFinishedAt)
	const pattern = formatRestartPattern(pod)
	const age = formatRelative(pod.createdAt)

	return (
		<div className="flex items-center gap-2 py-0.5 group">
			<span className="text-xs text-muted-foreground font-mono truncate flex-1">{pod.name}</span>
			<span className="text-xs text-muted-foreground whitespace-nowrap">
				{pod.restarts} restarts
				{age ? ' · ' + age : ''}
				{pattern ? ' · ' + pattern : ''}
				{' · ' + reason}
				{exit ? ' (' + exit + ')' : ''}
				{last ? ' · último ' + last : ''}
			</span>
			{(onViewLogs || onOpenTerminal) && (
				<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
					{onViewLogs && (
						<button
							type="button"
							onClick={() => onViewLogs({ name: deploymentName, namespace: pod.namespace } as DeploymentInfo, '')}
							className="p-0.5 hover:bg-muted/30 rounded text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
							title="Ver logs"
						>
							<FileText className="w-3 h-3" />
						</button>
					)}
					{onOpenTerminal && (
						<button
							type="button"
							onClick={() => onOpenTerminal({ name: deploymentName, namespace: pod.namespace } as DeploymentInfo, '')}
							className="p-0.5 hover:bg-muted/30 rounded text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
							title="Terminal"
						>
							<Terminal className="w-3 h-3" />
						</button>
					)}
				</div>
			)}
		</div>
	)
}

function NamespaceHealthModal({
	open,
	onOpenChange,
	namespace,
	context,
	issues,
	onViewLogs,
	onOpenTerminal,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	namespace: string
	context: string
	issues: NamespaceHealthIssue[]
	onViewLogs?: (deployment: DeploymentInfo, context: string) => void
	onOpenTerminal?: (deployment: DeploymentInfo, context: string) => void
}) {
	const [expandedIssues, setExpandedIssues] = useState<Set<number>>(() => new Set(issues.map((_, i) => i)))
	const [filter, setFilter] = useState('')
	const totalProblems = issues.reduce((acc, i) => acc + i.count, 0)
	const hasCritical = issues.some(i => ISSUE_COLORS[i.type] === 'text-destructive')

	const toggleIssue = (idx: number) => {
		setExpandedIssues(prev => {
			const next = new Set(prev)
			if (next.has(idx)) next.delete(idx)
			else next.add(idx)
			return next
		})
	}

	const filteredIssues = useMemo(() => {
		if (!filter.trim()) return issues
		const q = filter.toLowerCase()
		return issues.map(issue => {
			if (issue.pods) {
				const filteredPods = issue.pods
					.map(g => ({
						...g,
						pods: g.pods.filter(p =>
							p.name.toLowerCase().includes(q) || g.deploymentName.toLowerCase().includes(q)
						),
					}))
					.filter(g => g.pods.length > 0)
				return { ...issue, pods: filteredPods, count: filteredPods.reduce((acc, g) => acc + g.pods.length, 0) }
			}
			if (issue.deployments) {
				const filteredDeps = issue.deployments.filter(d => d.name.toLowerCase().includes(q))
				return { ...issue, deployments: filteredDeps, count: filteredDeps.length }
			}
			return issue
		}).filter(issue => issue.count > 0)
	}, [issues, filter])

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
			maxWidth="max-w-2xl"
		>
			<div className="flex flex-col gap-3 overflow-y-auto px-2 pb-2">
				<div className="flex items-center justify-between gap-3">
					<span className="text-sm text-muted-foreground">
						{totalProblems} {totalProblems === 1 ? 'problema' : 'problemas'} detectados
					</span>
					<div className="relative flex-1 max-w-[240px]">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
						<input
							type="text"
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							placeholder="Filtrar..."
							className="w-full pl-7 pr-2 py-1 text-xs bg-muted/30 border border-border rounded-md focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
						/>
					</div>
				</div>
				{filteredIssues.map((issue, idx) => {
					const Icon = ISSUE_ICONS[issue.type]
					const color = ISSUE_COLORS[issue.type]
					const isExpanded = expandedIssues.has(idx)
					return (
						<div key={idx} className="border border-border rounded-md">
							<button
								type="button"
								onClick={() => toggleIssue(idx)}
								className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none rounded-md"
							>
								<Icon className={"w-4 h-4 shrink-0 " + color} />
								<span className={"text-sm font-medium " + color}>{issue.label}</span>
								<span className="text-xs text-muted-foreground">· {issue.count}</span>
								{isExpanded
									? <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
									: <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
								}
							</button>
							{isExpanded && (
								<div className="flex flex-col gap-2 px-3 pb-2 pl-10">
									{issue.pods?.map((group, gi) => (
										<div key={gi} className="flex flex-col gap-0.5">
											<span className="text-xs font-medium text-foreground">
												{group.deploymentName}
												<span className="text-muted-foreground font-normal">
													{' · '}{group.pods.length}{' '}{group.pods.length === 1 ? 'pod' : 'pods'}
													{' · '}{group.totalRestarts} restarts total
												</span>
											</span>
											{group.pods.map((pod, pi) => (
												<PodRow
													key={pi}
													pod={pod}
													deploymentName={group.deploymentName}
													onViewLogs={onViewLogs}
													onOpenTerminal={onOpenTerminal}
												/>
											))}
										</div>
									))}
									{issue.deployments?.map((d, di) => (
										<span key={di} className="text-xs text-muted-foreground font-mono">
											{d.name}: {d.behindBy} commits detrás de HEAD
										</span>
									))}
								</div>
							)}
						</div>
					)
				})}
				{filteredIssues.length === 0 && filter && (
					<div className="text-sm text-muted-foreground text-center py-4">
						Sin resultados para "{filter}"
					</div>
				)}
			</div>
		</BaseDialog>
	)
}

/**
 * Hook that returns pod health for a single deployment.
 * Reuses the namespace-level pod health query and filters by deployment name.
 */
export function useDeploymentPodHealth(namespace: string, context: string, deploymentName: string, enabled: boolean) {
	return useQuery({
		queryKey: ['kubectl', 'pod-health-detail', context, namespace, deploymentName],
		queryFn: async () => {
			const { getPodHealthForNamespace } = await import('@/api/kubectl')
			const pods = await getPodHealthForNamespace(namespace, context)
			return pods.filter(p => getDeploymentName(p.name) === deploymentName)
		},
		enabled,
		...applyCachePolicy('kubectl'),
		staleTime: 60 * 1000,
	})
}

type DeploymentPodStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

function getDeploymentPodStatus(pods: PodHealthInfo[]): { status: DeploymentPodStatus; readyCount: number; totalCount: number; restarts: number; hasOom: boolean; hasCrash: boolean } {
	if (pods.length === 0) return { status: 'unknown', readyCount: 0, totalCount: 0, restarts: 0, hasOom: false, hasCrash: false }

	const totalCount = pods.length
	const readyCount = pods.filter(p => {
		if (!p.ready) return false
		const [r, t] = p.ready.split('/')
		return r === t
	}).length
	const totalRestarts = pods.reduce((acc, p) => acc + p.restarts, 0)
	const hasCrash = pods.some(p => p.phase === 'CrashLoopBackOff')
	const hasOom = pods.some(p => (p.containers || []).some(c => c.lastStateReason === 'OOMKilled' || c.stateReason === 'OOMKilled'))
	const hasImagePull = pods.some(p => p.phase === 'ImagePullBackOff' || p.phase === 'ErrImagePull')
	const hasHighRestarts = pods.some(p => p.restarts >= RESTART_THRESHOLD)

	let status: DeploymentPodStatus = 'healthy'
	if (hasCrash || hasOom || hasImagePull) status = 'critical'
	else if (hasHighRestarts || readyCount < totalCount) status = 'warning'

	return { status, readyCount, totalCount, restarts: totalRestarts, hasOom, hasCrash }
}

/**
 * Cell component for the Pods column in the deployment table.
 * Shows pod count and health status icon. Click opens a deployment-scoped health modal.
 */
export function PodHealthCell({
	deployment,
	isLoading,
}: {
	deployment: DeploymentWithContext
	isLoading: boolean
}) {
	const [isOpen, setIsOpen] = useState(false)
	const enabled = !!deployment.context && !!deployment.namespace && !deployment.isPlaceholder && !isLoading
	const { data: pods, isLoading: isPodLoading } = useDeploymentPodHealth(
		deployment.namespace,
		deployment.context || '',
		deployment.name,
		enabled,
	)

	if (isLoading || deployment.isPlaceholder) {
		return <div className="h-4 bg-muted rounded w-12 animate-pulse" />
	}

	if (isPodLoading || !pods) {
		return <div className="h-4 bg-muted rounded w-12 animate-pulse" />
	}

	const { status, readyCount, totalCount, restarts, hasOom, hasCrash } = getDeploymentPodStatus(pods)

	const icon = status === 'critical'
		? <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
		: status === 'warning'
			? <CircleAlert className="w-3.5 h-3.5 text-warning" />
			: <CheckCircle2 className="w-3.5 h-3.5 text-success" />

	const label = status === 'critical'
		? `${readyCount}/${totalCount}${hasOom ? ' · OOM' : hasCrash ? ' · crash' : ''}`
		: status === 'warning'
			? `${readyCount}/${totalCount} · ${restarts}r`
			: `${readyCount}/${totalCount}`

	const title = status === 'healthy'
		? `${readyCount}/${totalCount} pods ready`
		: status === 'unknown'
			? 'Sin datos de pods'
			: `${readyCount}/${totalCount} pods ready · ${restarts} restarts${hasOom ? ' · OOMKilled' : ''}${hasCrash ? ' · CrashLoop' : ''} — click para ver detalle`

	const issues = status === 'healthy' ? [] : analyzePods(pods)

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none rounded"
				title={title}
			>
				{icon}
				<span className="text-muted-foreground font-mono">{label}</span>
			</button>
			{isOpen && (
				<NamespaceHealthModal
					open={isOpen}
					onOpenChange={setIsOpen}
					namespace={deployment.name}
					context={deployment.context || ''}
					issues={issues}
				/>
			)}
		</>
	)
}
