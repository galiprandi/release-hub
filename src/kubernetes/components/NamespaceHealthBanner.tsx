import { useState } from "react"
import { AlertTriangle, ChevronDown, ChevronRight, CircleDot } from "lucide-react"

export interface NamespaceHealthIssue {
	type: 'crashloop' | 'not-ready' | 'oomkilled' | 'imagepull' | 'restarts' | 'old-image' | 'commit-behind'
	label: string
	count: number
	detail?: string[]
}

export interface NamespaceHealthData {
	namespace: string
	context: string
	issues: NamespaceHealthIssue[]
}

// Mock data — reemplazar con datos reales de kubectl get pods + usePodCommitSync + useDeployedCommitStatus
const MOCK_HEALTH: Record<string, NamespaceHealthData> = {
	'demo-staging/demo-ns': {
		namespace: 'demo-ns',
		context: 'demo-staging',
		issues: [
			{
				type: 'crashloop',
				label: 'CrashLoop',
				count: 1,
				detail: ['scheduler-dp-868785f69b-lk99c: CrashLoopBackOff (exit 137)'],
			},
			{
				type: 'not-ready',
				label: 'NotReady',
				count: 1,
				detail: ['stores-dp-75984b9fdc-8j8kk: readiness probe failed'],
			},
			{
				type: 'commit-behind',
				label: 'Commit atrasado',
				count: 1,
				detail: ['task-notifier-dp: 5 commits detrás de HEAD'],
			},
		],
	},
	'demo-staging/demo-orders': {
		namespace: 'demo-orders',
		context: 'demo-staging',
		issues: [],
	},
	'demo-prod/demo-ns': {
		namespace: 'demo-ns',
		context: 'demo-prod',
		issues: [
			{
				type: 'old-image',
				label: 'Imagen vieja',
				count: 1,
				detail: ['users-dp: pods corriendo commit anterior al spec'],
			},
		],
	},
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

export function NamespaceHealthBanner({ namespace, context }: { namespace: string; context: string }) {
	const [isExpanded, setIsExpanded] = useState(false)

	const key = context + '/' + namespace
	const health = MOCK_HEALTH[key]

	if (!health || health.issues.length === 0) return null

	const totalProblems = health.issues.reduce((acc, i) => acc + i.count, 0)
	const hasCritical = health.issues.some(i => ISSUE_COLORS[i.type] === 'text-destructive')
	const bannerClass = hasCritical ? 'bg-destructive/5' : 'bg-warning/5'
	const iconClass = hasCritical ? 'text-destructive' : 'text-warning'

	return (
		<div className={"flex flex-col gap-1 px-3 py-2 border border-border border-b-0 rounded-t-md text-xs " + bannerClass}>
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-2 w-full text-left focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none rounded"
			>
				<AlertTriangle className={"w-3.5 h-3.5 shrink-0 " + iconClass} />
				<span className={"font-medium " + iconClass}>
					{totalProblems} {totalProblems === 1 ? 'problema' : 'problemas'}
				</span>
				<span className="text-muted-foreground">
					{health.issues.map(i => i.count + ' ' + i.label).join(' · ')}
				</span>
				{isExpanded
					? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
					: <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
				}
			</button>
			{isExpanded && (
				<div className="flex flex-col gap-1.5 pl-6 pt-1">
					{health.issues.map((issue, idx) => {
						const Icon = ISSUE_ICONS[issue.type]
						const color = ISSUE_COLORS[issue.type]
						return (
							<div key={idx} className="flex flex-col gap-0.5">
								<div className="flex items-center gap-1.5">
									<Icon className={"w-3 h-3 shrink-0 " + color} />
									<span className={"font-medium " + color}>{issue.label}</span>
									<span className="text-muted-foreground">· {issue.count}</span>
								</div>
								{issue.detail && issue.detail.length > 0 && (
									<div className="flex flex-col gap-0.5 pl-4">
										{issue.detail.map((d, i) => (
											<span key={i} className="text-muted-foreground font-mono text-[11px]">{d}</span>
										))}
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
