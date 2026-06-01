import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { Star, Terminal as TerminalIcon } from "lucide-react"
import type { DeploymentInfo } from "@/api/kubectl"
import { getPodsForDeployment } from "@/api/kubectl"
import { LogsViewer } from "@/components/shared/LogsViewer"
import { Terminal } from "@/components/shared/Terminal"
import { BaseDialog } from "@/components/ui/BaseDialog"
import { StatusCard } from "@/components/ui/StatusCard"
import { Table } from "@/components/ui/Table"
import type { ColumnDef } from "@tanstack/react-table"
import { useUserCollections } from "@/hooks/useUserCollections"
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"
import { PortForwardControl } from "@/components/ui/PortForwardControl"
import { usePortForward } from "@/hooks/usePortForward"
import { usePortFree } from "@/hooks/usePortFree"
import { DEFAULT_START_PORT } from "@/config/portForward"

const STORAGE_KEY = "kubernetes-deployments-metadata"

function loadDeploymentsFromStorage(): Record<string, DeploymentInfo> {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			return JSON.parse(stored)
		}
	} catch (error) {
		console.error("[Kubernetes] Failed to load deployments from localStorage:", error)
	}
	return {}
}

function saveDeploymentsToStorage(deployments: Record<string, DeploymentInfo>): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(deployments))
	} catch (error) {
		console.error("[Kubernetes] Failed to save deployments to localStorage:", error)
	}
}

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
	const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false)
	const [selectedPodName, setSelectedPodName] = useState<string | null>(null)
	const [cachedDeployments, setCachedDeployments] = useState<Record<string, DeploymentInfo>>(loadDeploymentsFromStorage())
	const { toggleDeploymentFavorite } = useUserCollections()

	// Parse favorite IDs to get deployment info
	const favoriteDeployments = useMemo(() => {
		if (!favorites || favorites.length === 0) return []
		return favorites.map(favId => {
			const [context, namespace, name] = favId.split('/')
			return { context, namespace, name }
		})
	}, [favorites])

	// Trigger fetch for all favorites in parallel and update localStorage
	const { isLoading } = useQuery({
		queryKey: ['kubectl', 'favorites-deployments', favorites],
		queryFn: async () => {
			if (!favorites || favorites.length === 0 || isKubectlInstalled !== true) return []

			const { getDeployment } = await import('@/api/kubectl')
			const updatedMetadata = { ...cachedDeployments }

			await Promise.all(
				favoriteDeployments.map(async ({ context, namespace, name }) => {
					const deploymentId = `${context}/${namespace}/${name}`
					try {
						const deployment = await getDeployment(name, namespace, context)
						if (deployment) {
							updatedMetadata[deploymentId] = deployment
						}
					} catch {
						// Silenciar errores de deployments que no existen
					}
				})
			)

			// Update localStorage with fresh data
			saveDeploymentsToStorage(updatedMetadata)
			setCachedDeployments(updatedMetadata)

			return []
		},
		enabled: isKubectlInstalled === true && favorites && favorites.length > 0,
		refetchOnWindowFocus: false,
		retry: 0,
	})

	// Get cached deployments from localStorage (instant display)
	const displayDeployments = useMemo(() => {
		if (!favorites || favorites.length === 0) return []

		return favorites.map(favId => {
			const cached = cachedDeployments[favId]
			if (cached) {
				const [context] = favId.split('/')
				return { context, deployment: cached }
			}
			return null
		}).filter(Boolean) as Array<{ context: string; deployment: DeploymentInfo }>
	}, [favorites, cachedDeployments])

	// Group by context for display
	const groupedDeployments = useMemo(() => {
		const groups: Record<string, DeploymentInfo[]> = {}
		displayDeployments.forEach(({ context, deployment }) => {
			if (!groups[context]) groups[context] = []
			groups[context].push(deployment)
		})
		return Object.entries(groups).map(([context, deployments]) => ({ context, deployments }))
	}, [displayDeployments])

	// Fetch function for logs with cursor support
	const fetchFn = async (cursor?: number) => {
		if (!selectedDeployment) return ''
		const { getResourceLogs } = await import('@/api/kubectl')
		return getResourceLogs('deployment', selectedDeployment.name, selectedDeployment.namespace, 100, selectedContext || undefined, cursor)
	}

	// Build resources list for LogsViewer select
	const resources = useMemo(() => {
		if (!displayDeployments) return []
		return displayDeployments.map(({ context, deployment }) => ({
			id: `${context}/${deployment.namespace}/${deployment.name}`,
			name: deployment.name,
			type: 'deployment' as const,
			context,
			namespace: deployment.namespace,
		}))
	}, [displayDeployments])

	const selectedResourceId = selectedDeployment ? `${selectedContext || ''}/${selectedDeployment.namespace}/${selectedDeployment.name}` : undefined

	const handleResourceChange = (resourceId: string) => {
		const resource = resources.find(r => r.id === resourceId)
		if (resource) {
			const deployment = displayDeployments
				?.find(d => d.context === resource.context && d.deployment.name === resource.name)
				?.deployment
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

	const handleOpenTerminal = (deployment: DeploymentInfo, deploymentContext: string) => {
		console.log('[DeploymentList] Opening terminal for deployment:', deployment.name, 'context:', deploymentContext)
		setSelectedDeployment(deployment)
		setSelectedContext(deploymentContext)
		setSelectedPodName(null)
		setIsTerminalModalOpen(true)
	}

	// Fetch pods for the selected deployment (for terminal pod selector)
	const { data: deploymentPods } = useQuery({
		queryKey: ['kubectl', 'pods-for-deployment', selectedDeployment?.name, selectedDeployment?.namespace, selectedContext],
		queryFn: async () => {
			if (!selectedDeployment || !selectedContext) return []
			return getPodsForDeployment(selectedDeployment.name, selectedDeployment.namespace, selectedContext)
		},
		enabled: isTerminalModalOpen && !!selectedDeployment && !!selectedContext,
		refetchOnWindowFocus: false,
		retry: 0,
	})

	// Compute default pod (first Running, fallback to first available)
	const defaultPod = deploymentPods && deploymentPods.length > 0
		? (deploymentPods.find(p => p.status === 'Running') || deploymentPods[0])
		: null
	const activePodName = selectedPodName || defaultPod?.name || null

	// Si no hay favoritos, no renderizar nada (el padre maneja el empty state)
	if (!favorites || favorites.length === 0) {
		return null
	}

	// Si kubectl no está instalado, mostrar error
	if (isKubectlInstalled === false) {
		return (
			<StatusCard
				type="error"
				message="kubectl no está instalado. Instálalo para gestionar deployments de Kubernetes."
			/>
		)
	}

	// Si no hay datos cacheados ni live después de cargar
	if (!isLoading && (!displayDeployments || displayDeployments.length === 0)) {
		return (
			<StatusCard
				type="offline"
				message="No hay deployments favoritos disponibles."
			/>
		)
	}

	return (
		<>
			{groupedDeployments.length > 0 && (
				<div className="space-y-12">
					{groupedDeployments.map(({ context: ctx, deployments }) => (
						<div key={ctx} className="space-y-3">
							<DeploymentsTable
								deployments={deployments}
								context={ctx}
								isLoading={isLoading}
								onViewLogs={handleViewLogs}
								onOpenTerminal={handleOpenTerminal}
								onRemoveFavorite={(deployment) => {
									const deploymentId = `${ctx}/${deployment.namespace}/${deployment.name}`
									toggleDeploymentFavorite(deploymentId)
									// Limpiar cache del deployment removido de localStorage
									const updated = { ...cachedDeployments }
									delete updated[deploymentId]
									saveDeploymentsToStorage(updated)
									setCachedDeployments(updated)
								}}
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
						key={`logs-${selectedDeployment.name}`}
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

			{isTerminalModalOpen && selectedDeployment &&
				createPortal(
					<BaseDialog
						open={true}
						onOpenChange={(open) => !open && setIsTerminalModalOpen(false)}
						title={
							<div className="flex items-center gap-2">
								<TerminalIcon className="w-4 h-4 text-primary" />
								<span>Terminal: {selectedDeployment.name}</span>
							</div>
						}
						headerExtra={
							deploymentPods && deploymentPods.length > 0 && (
								<select
									value={activePodName || ''}
									onChange={(e) => setSelectedPodName(e.target.value || null)}
									className="text-xs bg-muted border rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
									aria-label="Seleccionar pod"
								>
									{deploymentPods.map((pod) => (
										<option key={pod.name} value={pod.name}>
											{pod.name} ({pod.status})
										</option>
									))}
								</select>
							)
						}
						maxWidth="max-w-6xl"
						className="w-[90vw] h-[80vh] !p-0"
					>
						<div className="flex-1 min-h-0 bg-black rounded-b-lg overflow-hidden">
							<Terminal
								key={`terminal-${activePodName || 'default'}`}
								type="k8s"
								name={selectedDeployment.name}
								podName={activePodName || undefined}
								namespace={selectedDeployment.namespace}
								context={selectedContext || undefined}
								className="border-none rounded-none h-full"
							/>
						</div>
					</BaseDialog>,
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
	onOpenTerminal,
	onRemoveFavorite,
	activeFilter,
	onFilterChange,
}: {
	deployments: DeploymentInfo[]
	context: string
	isLoading: boolean
	onViewLogs: (deployment: DeploymentInfo, context: string) => void
	onOpenTerminal: (deployment: DeploymentInfo, context: string) => void
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
			id: "portForward",
			header: "Port Forward",
			enableSorting: false,
			cell: ({ row }) => (
				<PortForwardCell
					deployment={row.original}
					context={context}
				/>
			),
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
					onOpenTerminal={onOpenTerminal}
					onRemoveFavorite={onRemoveFavorite}
				/>
			),
		},
	], [context, isLoading, onViewLogs, onOpenTerminal, onRemoveFavorite])

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
	onOpenTerminal,
	onRemoveFavorite,
}: {
	deployment: DeploymentInfo
	context: string
	onViewLogs: (deployment: DeploymentInfo, context: string) => void
	onOpenTerminal: (deployment: DeploymentInfo, context: string) => void
	onRemoveFavorite: (deployment: DeploymentInfo) => void
}) {
	return (
		<div className="flex items-center justify-end gap-1.5">
			<ActionButton
				action={ACTION_DEFINITIONS.viewLogs}
				onClick={() => onViewLogs(deployment, context)}
			/>
			<ActionButton
				action={ACTION_DEFINITIONS.openTerminal}
				onClick={() => onOpenTerminal(deployment, context)}
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

function PortForwardCell({ deployment, context }: { deployment: DeploymentInfo & { context: string }; context: string }) {
	const { connect, disconnect, status, error, isActive, localPort } = usePortForward({
		deployment: deployment.name,
		namespace: deployment.namespace,
		context,
	})

	const { data: freePort } = usePortFree()
	const [userPort, setUserPort] = useState("")

	const suggestedPort = isActive && localPort != null
		? String(localPort)
		: (userPort || (freePort != null ? String(freePort) : ""))

	const handleConnect = async (port: number) => {
		await connect(port, 8080)
	}

	return (
		<PortForwardControl
			value={suggestedPort}
			placeholder={String(DEFAULT_START_PORT)}
			onChange={setUserPort}
			onConnect={handleConnect}
			onDisconnect={disconnect}
			status={status}
			error={error}
		/>
	)
}
