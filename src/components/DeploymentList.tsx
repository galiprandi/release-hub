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
import { Table } from "@/components/ui/Table"
import type { ColumnDef } from "@tanstack/react-table"
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
		placeholderData: (previousData) => previousData,
		staleTime: favorites && favorites.length > 0 ? 30 * 1000 : 0, // 30s si hay favoritos, 0 si no
		gcTime: 5 * 60 * 1000, // 5 minutos para permitir cache temporal
		refetchOnWindowFocus: false,
		retry: 0,
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

	// Si no hay datos después de cargar
	if (!isLoading && (!filteredDeployments || filteredDeployments.length === 0)) {
		return (
			<StatusCard
				type="offline"
				message={favorites && favorites.length > 0 ? "No hay deployments favoritos disponibles." : "No hay deployments disponibles en ningún contexto."}
			/>
		)
	}

	return (
		<>
			<div className="space-y-12">
				{filteredDeployments?.map(({ context: ctx, deployments }) => (
					<div key={ctx} className="space-y-3">
						<DeploymentsTable
							deployments={deployments}
							context={ctx}
							isLoading={isLoading}
							onViewLogs={handleViewLogs}
							onRemoveFavorite={(deployment) => toggleDeploymentFavorite(`${ctx}/${deployment.namespace}/${deployment.name}`)}
						/>
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

function DeploymentsTable({
	deployments,
	context,
	isLoading,
	onViewLogs,
	onRemoveFavorite,
}: {
	deployments: DeploymentInfo[]
	context: string
	isLoading: boolean
	onViewLogs: (deployment: DeploymentInfo, context: string) => void
	onRemoveFavorite: (deployment: DeploymentInfo) => void
}) {
	const sortedDeployments = [...deployments].sort((a, b) => a.name.localeCompare(b.name))

	const columns: ColumnDef<DeploymentInfo & { context: string }>[] = [
		{
			accessorKey: "name",
			header: () => (
				<div className="flex items-center gap-2">
					<span>{context}</span>
				</div>
			),
			cell: ({ row }) => <DeploymentNameCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			accessorKey: "namespace",
			header: "Namespace",
			cell: ({ row }) => row.original.namespace,
		},
		{
			accessorKey: "ready",
			header: "Ready",
			cell: ({ row }) => <ReadyCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			accessorKey: "upToDate",
			header: "Up-to-date",
			cell: ({ row }) => row.original.upToDate,
		},
		{
			accessorKey: "available",
			header: "Available",
			cell: ({ row }) => row.original.available,
		},
		{
			id: "actions",
			accessorKey: "actions",
			header: "Acciones",
			enableSorting: false,
			cell: ({ row }) => (
				<ActionsCell
					deployment={row.original}
					context={context}
					onViewLogs={onViewLogs}
					onRemoveFavorite={onRemoveFavorite}
				/>
			),
		},
	]

	const dataWithContext = sortedDeployments.map(d => ({ ...d, context }))

	return <Table columns={columns} data={dataWithContext} />
}

function DeploymentNameCell({ deployment, isLoading }: { deployment: DeploymentInfo & { context: string }; isLoading: boolean }) {
	if (isLoading) {
		return (
			<div className="flex items-center gap-2">
				<div className="h-4 bg-muted rounded w-32" />
			</div>
		)
	}

	return <span className="font-medium text-foreground text-sm">{deployment.name}</span>
}

function ReadyCell({ deployment, isLoading }: { deployment: DeploymentInfo; isLoading: boolean }) {
	if (isLoading) {
		return <div className="h-6 bg-muted rounded w-16" />
	}

	const isReady = deployment.ready === deployment.upToDate && deployment.ready === deployment.available

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

function ActionsCell({
	deployment,
	context,
	onViewLogs,
	onRemoveFavorite,
}: {
	deployment: DeploymentInfo
	context: string
	onViewLogs: (deployment: DeploymentInfo, context: string) => void
	onRemoveFavorite: (deployment: DeploymentInfo) => void
}) {
	return (
		<div className="flex items-center justify-end gap-1.5">
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							type="button"
							onClick={() => onRemoveFavorite(deployment)}
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
				onClick={() => onViewLogs(deployment, context)}
				className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 shadow-sm"
				aria-label="Ver logs"
			>
				<Terminal className="w-4 h-4" />
				<span>logs</span>
			</button>
		</div>
	)
}
