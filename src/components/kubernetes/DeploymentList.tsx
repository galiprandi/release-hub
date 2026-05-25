import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { Star } from "lucide-react"
import { getDeployments, getResourceLogs, type DeploymentInfo } from "@/api/kubectl"
import { getContexts } from "@/api/kubectl"
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys"
import { LogsViewer } from "@/components/shared/LogsViewer"
import { StatusCard } from "@/components/ui/StatusCard"
import { Table } from "@/components/ui/Table"
import type { ColumnDef } from "@tanstack/react-table"
import { useUserCollections } from "@/hooks/useUserCollections"
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"

interface DeploymentListProps {
	favorites?: string[]
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
	isKubectlInstalled?: boolean
}

export const DeploymentList = ({ favorites, activeFilter, onFilterChange, isKubectlInstalled }: DeploymentListProps) => {
	const [selectedDeployment, setSelectedDeployment] = useState<DeploymentInfo | null>(null)
	const [selectedContext, setSelectedContext] = useState<string | null>(null)
	const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
	const { toggleDeploymentFavorite } = useUserCollections()

	// Get all contexts - only if kubectl is installed
	const { data: contexts } = useQuery({
		queryKey: queryKeys.kubectl.contexts(),
		queryFn: getContexts,
		...applyCachePolicy("kubectl"),
		enabled: isKubectlInstalled === true,
	})

	// Get deployments for all contexts - only if kubectl is installed
	const { data: allDeployments, isLoading } = useQuery({
		queryKey: ["kubectl", "all-deployments"],
		queryFn: async () => {
			if (!contexts || contexts.length === 0) return []

			const deploymentsByContext = await Promise.all(
				contexts.map(async (ctx) => {
					try {
						const deployments = await getDeployments(undefined, ctx)
						return { context: ctx, deployments }
					} catch {
						return { context: ctx, deployments: [] }
					}
				})
			)

			return deploymentsByContext.filter((item) => item.deployments.length > 0)
		},
		enabled: isKubectlInstalled === true && !!contexts && contexts.length > 0,
		placeholderData: (previousData) => previousData,
		staleTime: 30 * 1000,
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
		return getResourceLogs('deployment', selectedDeployment.name, selectedDeployment.namespace, 100, selectedContext || undefined, cursor)
	}

	// Build resources list for LogsViewer select
	const resources = useMemo(() => {
		if (!allDeployments) return []
		return allDeployments.flatMap(({ context: ctx, deployments }) =>
			deployments.map(d => ({ id: `${ctx}/${d.namespace}/${d.name}`, name: d.name, type: 'deployment', context: ctx, namespace: d.namespace }))
		)
	}, [allDeployments])

	const selectedResourceId = selectedDeployment ? `${selectedContext || ''}/${selectedDeployment.namespace}/${selectedDeployment.name}` : undefined

	const handleResourceChange = (resourceId: string) => {
		const resource = resources.find(r => r.id === resourceId)
		if (resource) {
			const deployment = allDeployments
				?.find(item => item.context === resource.context)
				?.deployments.find(d => d.name === resource.name)
			if (deployment) {
				setSelectedDeployment(deployment)
				setSelectedContext(resource.context)
			}
		}
	}

	const handleViewLogs = (deployment: DeploymentInfo, deploymentContext: string) => {
		console.log('[DeploymentList] Opening logs for deployment:', deployment.name, 'context:', deploymentContext)
		setSelectedDeployment(deployment)
		setSelectedContext(deploymentContext)
		setIsLogsModalOpen(true)
	}

	// Si no hay favoritos, no renderizar nada (el padre maneja el empty state)
	if (!favorites || favorites.length === 0) {
		return null
	}

	// Si no hay datos después de cargar y kubectl está instalado
	if (isKubectlInstalled !== false && !isLoading && (!filteredDeployments || filteredDeployments.length === 0)) {
		return (
			<StatusCard
				type="offline"
				message="No hay deployments favoritos disponibles."
			/>
		)
	}

	// Si kubectl no está instalado, no mostrar nada (dejar que el PageLayout maneje el empty state)
	if (isKubectlInstalled === false) {
		return null
	}

	return (
		<>
			{filteredDeployments && filteredDeployments.length > 0 && (
				<div className="space-y-12">
					{filteredDeployments.map(({ context: ctx, deployments }) => (
						<div key={ctx} className="space-y-3">
							<DeploymentsTable
								deployments={deployments}
								context={ctx}
								isLoading={isLoading}
								onViewLogs={handleViewLogs}
								onRemoveFavorite={(deployment) => toggleDeploymentFavorite(`${ctx}/${deployment.namespace}/${deployment.name}`)}
								activeFilter={activeFilter}
								onFilterChange={onFilterChange}
							/>
						</div>
					))}
				</div>
			)}

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
	activeFilter,
	onFilterChange,
}: {
	deployments: DeploymentInfo[]
	context: string
	isLoading: boolean
	onViewLogs: (deployment: DeploymentInfo, context: string) => void
	onRemoveFavorite: (deployment: DeploymentInfo) => void
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
}) {
	const sortedDeployments = useMemo(() => {
		return [...deployments].sort((a, b) => a.name.localeCompare(b.name))
	}, [deployments])

	// Get unique namespaces for filters
	const namespaces = useMemo(() => {
		const uniqueNamespaces = Array.from(new Set(deployments.map(d => d.namespace))).sort()
		return uniqueNamespaces
	}, [deployments])

	const filters = useMemo(() => {
		return namespaces.map(ns => ({
			label: ns,
			columnId: 'namespace' as const,
			value: ns,
		}))
	}, [namespaces])

	const columns: ColumnDef<DeploymentInfo & { context: string }>[] = useMemo(() => [
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
			id: "namespace",
			accessorKey: "namespace",
			header: "Espacio de nombres",
			cell: ({ row }) => row.original.namespace,
			filterFn: 'equalsString',
		},
		{
			accessorKey: "status",
			header: "Estado",
			cell: ({ row }) => <StatusCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			accessorKey: "age",
			header: "Antigüedad",
			cell: ({ row }) => <AgeCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			accessorKey: "images",
			header: "Imágenes",
			cell: ({ row }) => <ImagesCell deployment={row.original} isLoading={isLoading} />,
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
	], [context, isLoading, onViewLogs, onRemoveFavorite])

	const dataWithContext = useMemo(() => sortedDeployments.map(d => ({ ...d, context })), [sortedDeployments, context])

	return (
		<Table
			columns={columns}
			data={dataWithContext}
			filters={filters}
			activeFilter={activeFilter}
			onFilterChange={onFilterChange}
		/>
	)
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

function StatusCell({ deployment, isLoading }: { deployment: DeploymentInfo; isLoading: boolean }) {
	if (isLoading) {
		return <div className="h-6 bg-muted rounded w-16" />
	}

	const variants: Record<string, string> = {
		healthy: 'bg-success/20 text-success',
		progressing: 'bg-info/20 text-info',
		degraded: 'bg-destructive/20 text-destructive',
		unknown: 'bg-muted text-muted-foreground',
	}

	return (
		<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${variants[deployment.status] || variants.unknown}`}>
			{deployment.status}
		</span>
	)
}

function AgeCell({ deployment, isLoading }: { deployment: DeploymentInfo; isLoading: boolean }) {
	if (isLoading) {
		return <div className="h-4 bg-muted rounded w-10" />
	}
	return <span className="text-sm text-muted-foreground">{deployment.age}</span>
}

function ImagesCell({ deployment, isLoading }: { deployment: DeploymentInfo; isLoading: boolean }) {
	const shortImages = useMemo(() => {
		return deployment.images.map(img => {
			const parts = img.split('/')
			const lastPart = parts[parts.length - 1] || img
			return lastPart
		})
	}, [deployment.images])

	if (isLoading) {
		return <div className="h-4 bg-muted rounded w-24" />
	}

	return (
		<div className="flex flex-col gap-0.5">
			{shortImages.map((img, i) => (
				<span key={i} className="text-xs text-muted-foreground font-mono truncate max-w-[180px]" title={deployment.images[i]}>
					{img}
				</span>
			))}
		</div>
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
			<ActionButton
				action={ACTION_DEFINITIONS.viewLogs}
				onClick={() => onViewLogs(deployment, context)}
			/>
			<button
				type="button"
				onClick={() => onRemoveFavorite(deployment)}
				className="p-1.5 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
				aria-label="Eliminar de favoritos"
			>
				<Star className="w-4 h-4 fill-current" />
			</button>
		</div>
	)
}
