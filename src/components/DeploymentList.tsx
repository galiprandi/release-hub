import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { Terminal, Star } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { getDeployments, getResourceLogs, type DeploymentInfo } from "@/api/kubectl"
import { getContexts, getCurrentContext } from "@/api/kubectl"
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys"
import { LogsViewer } from "@/components/shared/LogsViewer"
import { StatusCard } from "@/components/ui/StatusCard"
import { useUserCollections } from "@/hooks/useUserCollections"

interface DeploymentListProps {
	context?: string
	namespace?: string
	favorites?: string[]
}

export const DeploymentList = ({ context, namespace, favorites }: DeploymentListProps) => {
	const [selectedDeployment, setSelectedDeployment] = useState<DeploymentInfo | null>(null)
	const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
	const { toggleDeploymentFavorite } = useUserCollections()

	// Get all contexts
	const { data: contexts } = useQuery({
		queryKey: queryKeys.kubectl.contexts(),
		queryFn: getContexts,
		...applyCachePolicy("kubectl"),
	})

	// Get current context
	const { data: currentContext } = useQuery({
		queryKey: ["kubectl", "current-context"],
		queryFn: getCurrentContext,
		...applyCachePolicy("kubectl"),
	})

	// Get deployments for all contexts
	const { data: allDeployments, isLoading } = useQuery({
		queryKey: ["kubectl", "all-deployments", namespace],
		queryFn: async () => {
			if (!contexts || contexts.length === 0) return []

			const deploymentsByContext = await Promise.all(
				contexts.map(async (ctx) => {
					try {
						const deployments = await getDeployments(namespace, ctx)
						return { context: ctx, deployments }
					} catch {
						return { context: ctx, deployments: [] }
					}
				})
			)

			return deploymentsByContext.filter((item) => item.deployments.length > 0)
		},
		enabled: !!contexts && contexts.length > 0,
		...applyCachePolicy("kubectl"),
	})

	// Filter deployments by favorites if provided
	const filteredDeployments = useMemo(() => {
		if (!favorites || favorites.length === 0) return allDeployments
		if (!allDeployments) return []

		return allDeployments
			.map(({ context: ctx, deployments }) => ({
				context: ctx,
				deployments: deployments.filter((d) =>
					favorites.includes(`${ctx}/${d.namespace}/${d.name}`)
				),
			}))
			.filter((item) => item.deployments.length > 0)
	}, [allDeployments, favorites])

	// Fetch function for logs with cursor support
	const fetchFn = (cursor?: number) => {
		if (!selectedDeployment) return Promise.resolve('')
		return getResourceLogs('deployment', selectedDeployment.name, selectedDeployment.namespace, 100, context, cursor)
	}

	// Build resources list for LogsViewer select
	const resources = useMemo(() => {
		if (!allDeployments) return []
		return allDeployments.flatMap(({ context: ctx, deployments }) =>
			deployments.map(d => ({ id: `${ctx}/${d.namespace}/${d.name}`, name: d.name, type: 'deployment', context: ctx, namespace: d.namespace }))
		)
	}, [allDeployments])

	const selectedResourceId = selectedDeployment ? `${context || currentContext || ''}/${selectedDeployment.namespace}/${selectedDeployment.name}` : undefined

	const handleResourceChange = (resourceId: string) => {
		const resource = resources.find(r => r.id === resourceId)
		if (resource) {
			const deployment = allDeployments
				?.find(item => item.context === resource.context)
				?.deployments.find(d => d.name === resource.name)
			if (deployment) setSelectedDeployment(deployment)
		}
	}

	const handleViewLogs = (deployment: DeploymentInfo, deploymentContext: string) => {
		console.log('[DeploymentList] Opening logs for deployment:', deployment.name, 'context:', deploymentContext)
		setSelectedDeployment(deployment)
		setIsLogsModalOpen(true)
	}

	if (isLoading) {
		return <StatusCard type="loading" message="Cargando deployments..." />
	}

	if (!filteredDeployments || filteredDeployments.length === 0) {
		return (
			<StatusCard
				type="offline"
				message={favorites && favorites.length > 0 ? "No hay deployments favoritos disponibles." : "No hay deployments disponibles en ningún contexto."}
			/>
		)
	}

	return (
		<>
			<div className="space-y-6">
				{filteredDeployments.map(({ context: ctx, deployments }) => (
					<div key={ctx} className="space-y-3">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-foreground">
								Contexto: {ctx}
								{ctx === currentContext && (
									<span className="ml-2 text-xs text-muted-foreground">(actual)</span>
								)}
							</h3>
							<span className="text-xs text-muted-foreground">({deployments.length} deployments)</span>
						</div>
						<div className="border border-border/60 rounded-xl overflow-hidden shadow-sm bg-card transition-all">
							<table className="w-full table-fixed">
								<thead className="bg-muted/40 border-b border-border/60">
									<tr>
										<th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[25%]">Deployment</th>
										<th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Namespace</th>
										<th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Ready</th>
										<th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Up-to-date</th>
										<th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Available</th>
										<th className="text-right px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Acciones</th>
									</tr>
								</thead>
								<tbody>
									{deployments.map((deployment) => (
										<DeploymentRow
											key={`${ctx}/${deployment.namespace}/${deployment.name}`}
											deployment={deployment}
											context={ctx}
											onViewLogs={() => handleViewLogs(deployment, ctx)}
											onRemoveFavorite={() => toggleDeploymentFavorite(`${ctx}/${deployment.namespace}/${deployment.name}`)}
										/>
									))}
								</tbody>
							</table>
						</div>
					</div>
				))}
			</div>

			{isLogsModalOpen && selectedDeployment &&
				createPortal(
					<LogsViewer
						key={selectedDeployment.name}
						fetchFn={fetchFn}
						onClose={() => setIsLogsModalOpen(false)}
						asModal={true}
						resources={resources}
						selectedResourceId={selectedResourceId}
						onResourceChange={handleResourceChange}
					/>,
					document.body
				)
			}
		</>
	)
}

function DeploymentRow({
	deployment,
	context,
	onViewLogs,
	onRemoveFavorite,
}: {
	deployment: DeploymentInfo
	context: string
	onViewLogs: () => void
	onRemoveFavorite: () => void
}) {
	const isReady = deployment.ready === deployment.upToDate && deployment.ready === deployment.available

	const getStatusBadge = () => {
		if (isReady) {
			return (
				<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-success/20 text-success">
					Ready
				</span>
			)
		}
		return (
			<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-warning/20 text-warning">
				Not Ready
			</span>
		)
	}

	return (
		<tr className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
			<td className="px-4 py-3 font-medium text-foreground text-sm">{deployment.name}</td>
			<td className="px-4 py-3 text-xs text-muted-foreground">{deployment.namespace}</td>
			<td className="px-4 py-3">{getStatusBadge()}</td>
			<td className="px-4 py-3 text-xs text-muted-foreground">{deployment.upToDate}</td>
			<td className="px-4 py-3 text-xs text-muted-foreground">{deployment.available}</td>
			<td className="px-4 py-3">
				<div className="flex items-center justify-end gap-1.5">
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="button"
									onClick={onRemoveFavorite}
									className="p-1.5 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
									aria-label="Eliminar de favoritos"
								>
									<Star className="w-4 h-4 fill-current" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
									sideOffset={5}
								>
									Eliminar de favoritos
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
					</Tooltip.Provider>
					<button
						type="button"
						onClick={onViewLogs}
						className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 shadow-sm"
						aria-label="Ver logs"
					>
						<Terminal className="w-4 h-4" />
						<span>logs</span>
					</button>
				</div>
			</td>
		</tr>
	)
}
