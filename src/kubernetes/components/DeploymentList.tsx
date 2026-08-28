import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { Boxes, Terminal as TerminalIcon, Folder, CheckCircle2, ArrowDownCircle } from "lucide-react"
import type { DeploymentInfo } from "@/api/kubectl"
import { LogsViewer } from "@/components/shared/LogsViewer"
import { Terminal } from "@/components/shared/Terminal"
import { BaseDialog } from "@/components/ui/BaseDialog"
import { StatusCard } from "@/components/ui/StatusCard"
import { Table } from "@/components/ui/Table"
import { EmptyState } from "@/components/shared/EmptyState"
import type { ColumnDef } from "@tanstack/react-table"
import { useUserCollections, type Project } from "@/hooks/useUserCollections"
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"
import { ItemProjectSelectionDialog } from "@/components/shared/ItemProjectSelectionDialog"
import { PortForwardControl } from "@/components/ui/PortForwardControl"
import { usePortForward } from "@/hooks/usePortForward"
import { usePortFree } from "@/hooks/usePortFree"
import { useDeployedCommitStatus } from "@/hooks/useDeployedCommitStatus"
import { usePodCommitSync } from "@/hooks/usePodCommitSync"
import { CopyButton } from "@/components/shared/CopyButton"
import { DEFAULT_START_PORT } from "@/config/portForward"

type CachedDeployment = DeploymentInfo & { fetchedAt?: number; isStale?: boolean }
type DeploymentWithContext = CachedDeployment & { context: string; isPlaceholder?: boolean }

const STORAGE_KEY = "kubernetes-deployments-metadata"

function buildPlaceholder(id: string): DeploymentWithContext {
	const [context, namespace, name] = id.split('/')
	return {
		namespace: namespace || '',
		name: name || id,
		ready: '',
		upToDate: '',
		available: '',
		age: '',
		images: [],
		status: 'unknown',
		context: context || '',
		isPlaceholder: true,
	}
}

function loadDeploymentsFromStorage(): Record<string, CachedDeployment> {
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

function saveDeploymentsToStorage(deployments: Record<string, CachedDeployment>): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(deployments))
	} catch (error) {
		console.error("[Kubernetes] Failed to save deployments to localStorage:", error)
	}
}

interface DeploymentListProps {
	favorites?: string[]
	projects?: Project[]
	activeTab?: 'favorites' | 'projects'
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
	isKubectlInstalled?: boolean
}

export const DeploymentList = ({
	favorites,
	projects = [],
	activeTab = 'favorites',
	activeFilter,
	onFilterChange,
	isKubectlInstalled
}: DeploymentListProps) => {
	const [selectedDeployment, setSelectedDeployment] = useState<DeploymentInfo | null>(null)
	const [selectedContext, setSelectedContext] = useState<string | null>(null)
	const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
	const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false)
	const [selectedPodName, setSelectedPodName] = useState<string | null>(null)
	const [cachedDeployments, setCachedDeployments] = useState<Record<string, CachedDeployment>>(loadDeploymentsFromStorage())
	const { toggleDeploymentFavorite } = useUserCollections()

	// All unique deployment IDs from favorites and projects
	const allDeploymentIds = useMemo(() => {
		const ids = new Set(favorites || [])
		projects.forEach(p => {
			p.deployments?.forEach((id: string) => ids.add(id))
		})
		return Array.from(ids)
	}, [favorites, projects])

	// Parse deployment IDs to get deployment info
	const allDeploymentsMeta = useMemo(() => {
		return allDeploymentIds.map(id => {
			const [context, namespace, name] = id.split('/')
			return { id, context, namespace, name }
		})
	}, [allDeploymentIds])

	// Trigger fetch for all deployments in parallel and update localStorage
	const { isLoading } = useQuery({
		queryKey: ['kubectl', 'all-deployments-metadata', allDeploymentIds],
		queryFn: async () => {
			if (allDeploymentIds.length === 0 || isKubectlInstalled !== true) return []

			const { getDeployment } = await import('@/api/kubectl')
			const updatedMetadata = { ...cachedDeployments }

			await Promise.all(
				allDeploymentsMeta.map(async ({ context, namespace, name, id }) => {
					try {
						const deployment = await getDeployment(name, namespace, context)
						if (deployment) {
							updatedMetadata[id] = { ...deployment, fetchedAt: Date.now(), isStale: false }
						} else if (updatedMetadata[id]) {
							// Cluster inalcanzable o deployment inexistente: marcar el cache como stale
							updatedMetadata[id] = { ...updatedMetadata[id], isStale: true }
						}
					} catch {
						if (updatedMetadata[id]) {
							updatedMetadata[id] = { ...updatedMetadata[id], isStale: true }
						}
					}
				})
			)

			// Update localStorage with fresh data
			saveDeploymentsToStorage(updatedMetadata)
			setCachedDeployments(updatedMetadata)

			return []
		},
		enabled: isKubectlInstalled === true && allDeploymentIds.length > 0,
		refetchOnWindowFocus: false,
		retry: 0,
	})

	// Get grouped deployments for display based on active tab
	// Favorites/projects without cached metadata render as placeholders (name from ID)
	// so the UI shows immediately; real data fills in when the query resolves.
	const groupedContent = useMemo(() => {
		if (activeTab === 'favorites') {
			const groups: Record<string, DeploymentWithContext[]> = {}
			favorites?.forEach(favId => {
				const cached = cachedDeployments[favId]
				const [context] = favId.split('/')
				if (!groups[context]) groups[context] = []
				if (cached) {
					groups[context].push({ ...cached, context })
				} else {
					groups[context].push(buildPlaceholder(favId))
				}
			})
			return Object.entries(groups).map(([context, deployments]) => ({
				id: context,
				label: context,
				icon: <Boxes className="w-4 h-4" />,
				deployments,
			}))
		} else {
			return projects
				.filter(p => p.deployments && p.deployments.length > 0)
				.map(project => {
					const deployments = project.deployments
						.map((id: string) => {
							const cached = cachedDeployments[id]
							if (cached) {
								const [context] = id.split('/')
								return { ...cached, context } as DeploymentWithContext
							}
							return buildPlaceholder(id)
						}) as DeploymentWithContext[]

					return {
						id: project.id,
						label: project.name,
						icon: <Folder className="w-4 h-4" />,
						deployments
					}
				})
		}
	}, [activeTab, favorites, projects, cachedDeployments])

	// For LogsViewer selector, we need all accessible deployments
	const allResolvedDeployments = useMemo(() => {
		return allDeploymentIds.map(id => {
			const cached = cachedDeployments[id]
			if (cached) {
				const [context] = id.split('/')
				return { context, deployment: cached }
			}
			return null
		}).filter(Boolean) as Array<{ context: string; deployment: DeploymentInfo }>
	}, [allDeploymentIds, cachedDeployments])

	// Fetch function for logs with cursor support
	const fetchFn = async (cursor?: number) => {
		if (!selectedDeployment) return ''
		const { getResourceLogs } = await import('@/api/kubectl')
		return getResourceLogs('deployment', selectedDeployment.name, selectedDeployment.namespace, 100, selectedContext || undefined, cursor)
	}

	// Build resources list for LogsViewer select
	const resources = useMemo(() => {
		return allResolvedDeployments.map(({ context, deployment }) => ({
			id: `${context}/${deployment.namespace}/${deployment.name}`,
			name: deployment.name,
			type: 'deployment' as const,
			context,
			namespace: deployment.namespace,
		}))
	}, [allResolvedDeployments])

	const selectedResourceId = selectedDeployment ? `${selectedContext || ''}/${selectedDeployment.namespace}/${selectedDeployment.name}` : undefined

	const handleResourceChange = (resourceId: string) => {
		const resource = resources.find(r => r.id === resourceId)
		if (resource) {
			const resolved = allResolvedDeployments
				?.find(d => d.context === resource.context && d.deployment.name === resource.name)
			if (resolved) {
				setSelectedDeployment(resolved.deployment)
				setSelectedContext(resolved.context)
			}
		}
	}

	const handleViewLogs = (deployment: DeploymentInfo, deploymentContext: string) => {
		setSelectedDeployment(deployment)
		setSelectedContext(deploymentContext)
		setIsLogsModalOpen(true)
	}

	const [isProjectSelectionOpen, setIsProjectSelectionOpen] = useState(false)
	const [deploymentToAssign, setDeploymentToAssign] = useState<string | null>(null)

	const handleOpenTerminal = (deployment: DeploymentInfo, deploymentContext: string) => {
		setSelectedDeployment(deployment)
		setSelectedContext(deploymentContext)
		setSelectedPodName(null)
		setIsTerminalModalOpen(true)
	}

	const handleManageProjects = (deployment: DeploymentInfo, deploymentContext: string) => {
		setDeploymentToAssign(`${deploymentContext}/${deployment.namespace}/${deployment.name}`)
		setIsProjectSelectionOpen(true)
	}

	// Fetch pods for the selected deployment (for terminal + logs pod selector)
	const { data: deploymentPods } = useQuery({
		queryKey: ['kubectl', 'pods-for-deployment', selectedDeployment?.name, selectedDeployment?.namespace, selectedContext],
		queryFn: async () => {
			if (!selectedDeployment || !selectedContext) return []
			const { getPodsForDeployment } = await import('@/api/kubectl')
			return getPodsForDeployment(selectedDeployment.name, selectedDeployment.namespace, selectedContext)
		},
		enabled: (isTerminalModalOpen || isLogsModalOpen) && !!selectedDeployment && !!selectedContext,
		refetchOnWindowFocus: false,
		retry: 0,
	})

	// Compute default pod (first Running, fallback to first available)
	const defaultPod = deploymentPods && deploymentPods.length > 0
		? (deploymentPods.find(p => p.status === 'Running') || deploymentPods[0])
		: null
	const activePodName = selectedPodName || defaultPod?.name || null

	// Si no hay contenido, no renderizar nada (el padre maneja el empty state)
	const hasContent = activeTab === 'favorites'
		? (favorites && favorites.length > 0)
		: projects.some(p => p.deployments && p.deployments.length > 0)

	if (!hasContent) {
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
	if (!isLoading && groupedContent.length === 0) {
		return (
			<EmptyState
				icon={<Boxes className="w-8 h-8 text-muted-foreground" />}
				label={activeTab === 'favorites' ? "No hay deployments favoritos" : "No hay deployments en proyectos"}
				caption={activeTab === 'favorites' ? "Añade deployments a favoritos para verlos aquí." : "Asigna deployments a tus proyectos para verlos aquí."}
			/>
		)
	}

	return (
		<>
			{groupedContent.length > 0 && (
				<div className="space-y-12">
					{groupedContent.map(({ id, label, icon, deployments }) => (
						<div key={id} className="space-y-3">
							<DeploymentsTable
								deployments={deployments}
								label={label}
								icon={icon}
								isLoading={isLoading}
								onViewLogs={handleViewLogs}
								onOpenTerminal={handleOpenTerminal}
								onRemoveFavorite={(deployment) => {
									const context = deployment.context
									if (!context) return
									const deploymentId = `${context}/${deployment.namespace}/${deployment.name}`
									toggleDeploymentFavorite(deploymentId)
									// Limpiar cache del deployment removido de localStorage
									const updated = { ...cachedDeployments }
									delete updated[deploymentId]
									saveDeploymentsToStorage(updated)
									setCachedDeployments(updated)
								}}
								onManageProjects={handleManageProjects}
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
						context="k8s"
						pods={(deploymentPods || []).map(p => ({ id: p.name, name: p.name, status: p.status }))}
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
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-primary/10">
									<TerminalIcon className="w-4 h-4 text-primary" />
								</div>
								<div className="flex flex-col">
									<span className="text-xs font-medium text-muted-foreground leading-none mb-1">
										{selectedContext}
									</span>
									<span className="text-sm font-bold tracking-tight leading-none">
										{selectedDeployment.name}
									</span>
								</div>
							</div>
						}
						headerExtra={
							deploymentPods && deploymentPods.length > 0 && (
								<select
									value={activePodName || ''}
									onChange={(e) => setSelectedPodName(e.target.value || null)}
									className="text-xs bg-muted border rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1"
									aria-label="Seleccionar pod para terminal o logs"
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
						<div className="flex-1 min-h-0 bg-zinc-950 rounded-b-lg overflow-hidden">
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

			{isProjectSelectionOpen && deploymentToAssign && (
				<ItemProjectSelectionDialog
					isOpen={isProjectSelectionOpen}
					onOpenChange={setIsProjectSelectionOpen}
					type="deployment"
					itemId={deploymentToAssign}
				/>
			)}
		</>
	)
}

function DeploymentsTable({
	deployments,
	label,
	icon,
	isLoading,
	onViewLogs,
	onOpenTerminal,
	onRemoveFavorite,
	onManageProjects,
	activeFilter,
	onFilterChange,
}: {
	deployments: DeploymentWithContext[]
	label: string
	icon?: React.ReactNode
	isLoading: boolean
	onViewLogs: (deployment: DeploymentInfo, context: string) => void
	onOpenTerminal: (deployment: DeploymentInfo, context: string) => void
	onRemoveFavorite: (deployment: DeploymentWithContext) => void
	onManageProjects: (deployment: DeploymentInfo, context: string) => void
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
}) {
	const sortedDeployments = useMemo(() => {
		return [...deployments].sort((a, b) => a.name.localeCompare(b.name))
	}, [deployments]) as DeploymentWithContext[]

	const columns: ColumnDef<DeploymentWithContext, unknown>[] = useMemo(() => [
		{
			accessorKey: "name",
			header: () => (
				<div className="flex items-center gap-2">
					{icon && <span className="text-primary">{icon}</span>}
					<span className="text-xs font-medium text-muted-foreground">{label}</span>
				</div>
			),
			cell: ({ row }) => <DeploymentNameCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			id: "namespace",
			accessorKey: "namespace",
			header: () => <span className="text-xs font-medium text-muted-foreground">Namespace</span>,
			cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.original.namespace}</span>,
			filterFn: 'equalsString',
		},
		{
			accessorKey: "status",
			header: () => <span className="text-xs font-medium text-muted-foreground">Estado</span>,
			cell: ({ row }) => <StatusCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			accessorKey: "age",
			header: () => <span className="text-xs font-medium text-muted-foreground">Age</span>,
			cell: ({ row }) => <AgeCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			id: "gitCommit",
			accessorKey: "gitCommit",
			header: () => <span className="text-xs font-medium text-muted-foreground">Commit</span>,
			enableSorting: false,
			cell: ({ row }) => <CommitCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			accessorKey: "images",
			header: () => <span className="text-xs font-medium text-muted-foreground">Imágenes</span>,
			cell: ({ row }) => <ImagesCell deployment={row.original} isLoading={isLoading} />,
		},
		{
			id: "portForward",
			header: () => <span className="text-xs font-medium text-muted-foreground">Port Forward</span>,
			enableSorting: false,
			cell: ({ row }) => (
				<PortForwardCell
					deployment={row.original}
					context={row.original.context}
				/>
			),
		},
		{
			id: "actions",
			accessorKey: "actions",
			header: () => <span className="text-xs font-medium text-muted-foreground text-right block w-full">Acciones</span>,
			enableSorting: false,
			cell: ({ row }) => (
				<ActionsCell
					deployment={row.original}
					context={row.original.context}
					onViewLogs={onViewLogs}
					onOpenTerminal={onOpenTerminal}
					onRemoveFavorite={onRemoveFavorite}
					onManageProjects={onManageProjects}
				/>
			),
		},
	], [label, icon, isLoading, onViewLogs, onOpenTerminal, onRemoveFavorite, onManageProjects])

	// Ensure each deployment has its context correctly assigned in the data mapping
	// This might require passing the context-to-deployment map if we want to be sure
	// For now, groupedContent already provides deployments that belong to that label (which is ctx in favorites)

	return (
		<Table
			columns={columns}
			data={sortedDeployments}
			activeFilter={activeFilter}
			onFilterChange={onFilterChange}
		/>
	)
}

function DeploymentNameCell({ deployment, isLoading }: { deployment: DeploymentWithContext; isLoading: boolean }) {
	// Name is always known from the favorite ID — show it immediately even for placeholders.
	// Only show skeleton if we truly don't have a name (edge case).
	if (isLoading && !deployment.name) {
		return (
			<div className="flex items-center gap-2">
				<div className="h-4 bg-muted/30 rounded w-32 animate-pulse" />
			</div>
		)
	}

	const staleSince = deployment.fetchedAt
		? new Date(deployment.fetchedAt).toLocaleString()
		: 'fecha desconocida'

	return (
		<span className="font-medium tracking-tight text-foreground text-sm">
			{deployment.name}
			{deployment.isPlaceholder && (
				<span className="ml-2 inline-block h-3 w-3 animate-pulse rounded-full bg-primary/40 align-middle" />
			)}
			{!deployment.isPlaceholder && deployment.isStale && (
				<span
					className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30 text-xs font-medium align-middle"
					title={`No se pudo actualizar desde el cluster (¿VPN?). Mostrando datos de cache del ${staleSince}. El commit y estado pueden estar desactualizados.`}
				>
					Cache
				</span>
			)}
		</span>
	)
}

function StatusCell({ deployment, isLoading }: { deployment: DeploymentInfo; isLoading: boolean }) {
	if (isLoading || (deployment as DeploymentWithContext).isPlaceholder) {
		return <div className="h-6 bg-muted/30 rounded w-16 animate-pulse" />
	}

	const variants: Record<string, { className: string; label: string }> = {
		healthy: { className: 'bg-success/20 text-success border-success/40', label: 'Saludable' },
		progressing: { className: 'bg-info/20 text-info border-info/40', label: 'Procesando' },
		degraded: { className: 'bg-destructive/20 text-destructive border-destructive/40', label: 'Degradado' },
		unknown: { className: 'bg-muted/30 text-muted-foreground border-border', label: 'Desconocido' },
	}

	const variant = variants[deployment.status] || variants.unknown

	return (
		<span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium uppercase ${variant.className}`}>
			{variant.label}
		</span>
	)
}

function AgeCell({ deployment, isLoading }: { deployment: DeploymentInfo; isLoading: boolean }) {
	if (isLoading || (deployment as DeploymentWithContext).isPlaceholder) {
		return <div className="h-4 bg-muted rounded w-10 animate-pulse" />
	}
	return <span className="text-xs font-medium text-muted-foreground">{deployment.age}</span>
}

function CommitCell({ deployment, isLoading }: { deployment: DeploymentWithContext; isLoading: boolean }) {
	const isPlaceholder = deployment.isPlaceholder === true
	const enabled = !isPlaceholder && !isLoading
	const { status, behindBy, isLoading: isComparing } = useDeployedCommitStatus({
		namespace: deployment.namespace,
		gitCommit: deployment.gitCommit,
		enabled,
	})
	const podSync = usePodCommitSync({
		namespace: deployment.namespace,
		context: deployment.context || undefined,
		selector: deployment.selector,
		specCommit: deployment.gitCommit,
		enabled,
	})

	if (isLoading || isPlaceholder) {
		return <div className="h-4 bg-muted rounded w-20 animate-pulse" />
	}

	if (!deployment.gitCommit) {
		return <span className="text-xs font-medium text-muted-foreground">—</span>
	}

	const stalePodsDetail = podSync.stalePods
		.map(p => `${p.name} → ${p.gitCommit ? p.gitCommit.slice(0, 7) : 'sin GIT_COMMIT'}`)
		.join('\n')

	return (
		<div className="flex items-center gap-1.5">
			<span
				className="font-mono text-xs font-medium text-muted-foreground"
				title={deployment.gitCommit}
			>
				{deployment.gitCommit.slice(0, 7)}
			</span>
			<CopyButton
				text={deployment.gitCommit}
				tooltip="Copiar commit"
				className="p-0.5"
			/>
			{isComparing && (
				<div className="h-4 bg-muted rounded w-14 animate-pulse" />
			)}
			{!isComparing && status === 'up-to-date' && (
				<span title="Actualizado: es el último commit del repo">
					<CheckCircle2 className="w-3.5 h-3.5 text-success" aria-label="Actualizado" />
				</span>
			)}
			{!isComparing && status === 'behind' && (
				<span
					className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30 text-xs font-medium"
					title={`Atrasado: el repo tiene ${behindBy} commit${behindBy === 1 ? '' : 's'} más nuevo${behindBy === 1 ? '' : 's'} que el desplegado`}
				>
					<ArrowDownCircle className="w-3.5 h-3.5" aria-label="Atrasado" />
					{behindBy}
				</span>
			)}
			{podSync.isLoading && (
				<div className="h-4 bg-muted rounded w-12 animate-pulse" />
			)}
			{!podSync.isLoading && podSync.status === 'synced' && (
				<span
					className="inline-flex items-center px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30 text-xs font-medium"
					title={`Todos los pods corren ${deployment.gitCommit.slice(0, 7)}`}
				>
					Pods {podSync.syncedCount}/{podSync.totalCount}
				</span>
			)}
			{!podSync.isLoading && podSync.status === 'drift' && (
				<span
					className="inline-flex items-center px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30 text-xs font-medium"
					title={`Pods con versión vieja:\n${stalePodsDetail}`}
				>
					Pods {podSync.syncedCount}/{podSync.totalCount}
				</span>
			)}
		</div>
	)
}

function ImagesCell({ deployment, isLoading }: { deployment: DeploymentInfo; isLoading: boolean }) {
	const shortImages = useMemo(() => {
		return deployment.images.map(img => {
			const parts = img.split('/')
			const lastPart = parts[parts.length - 1] || img
			return lastPart
		})
	}, [deployment.images])

	if (isLoading || (deployment as DeploymentWithContext).isPlaceholder) {
		return <div className="h-4 bg-muted rounded w-24 animate-pulse" />
	}

	return (
		<div className="flex flex-col gap-1">
			{shortImages.map((img, i) => (
				<div key={i} className="flex">
					<span
						className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted/30 border border-border text-xs font-medium text-muted-foreground tracking-tighter truncate max-w-[180px]"
						title={deployment.images[i]}
					>
						{img}
					</span>
				</div>
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
	onManageProjects,
}: {
	deployment: DeploymentWithContext
	context: string
	onViewLogs: (deployment: DeploymentInfo, context: string) => void
	onOpenTerminal: (deployment: DeploymentInfo, context: string) => void
	onRemoveFavorite: (deployment: DeploymentWithContext) => void
	onManageProjects: (deployment: DeploymentInfo, context: string) => void
}) {
	return (
		<div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
			<ActionButton
				action={ACTION_DEFINITIONS.viewLogs}
				onClick={() => onViewLogs(deployment, context)}
				size="sm"
			/>
			<ActionButton
				action={ACTION_DEFINITIONS.openTerminal}
				onClick={() => onOpenTerminal(deployment, context)}
			/>
			<div className="w-px h-4 bg-border mx-0.5" />
			<ActionButton
				action={ACTION_DEFINITIONS.manageProjects}
				onClick={() => onManageProjects(deployment, context)}
				size="sm"
			/>
			<ActionButton
				action={ACTION_DEFINITIONS.removeFavorite}
				onClick={() => onRemoveFavorite(deployment)}
			/>
		</div>
	)
}

function PortForwardCell({ deployment, context }: { deployment: DeploymentWithContext; context: string }) {
	const isPlaceholder = deployment.isPlaceholder === true

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

	if (isPlaceholder) {
		return <div className="h-8 bg-muted/30 rounded w-32 animate-pulse" />
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
