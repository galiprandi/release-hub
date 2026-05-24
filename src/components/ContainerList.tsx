import { useState, forwardRef, useImperativeHandle, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink } from "lucide-react"
import { getContainers, getContainerLogs, startContainer, restartContainer, stopContainer, type ContainerInfo } from "@/api/docker"
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys"
import { LogsViewer } from "@/components/shared/LogsViewer"
import { StatusCard } from "@/components/ui/StatusCard"
import { Table } from "@/components/ui/Table"
import type { ColumnDef } from "@tanstack/react-table"
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"

export interface ContainerListRef {
	refetch: () => void
}

interface ContainerListProps {
	statusFilter?: 'all' | 'running' | 'stopped' | 'exited'
	searchQuery?: string
}

export const ContainerList = forwardRef<ContainerListRef, ContainerListProps>(({ statusFilter = 'all', searchQuery = '' }, ref) => {
	const queryClient = useQueryClient()
	const [selectedContainer, setSelectedContainer] = useState<ContainerInfo | null>(null)
	const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)

	const { data: containers, isLoading, refetch } = useQuery({
		queryKey: queryKeys.docker.containers(),
		queryFn: getContainers,
		...applyCachePolicy("docker"),
	})

	// Fetch function for logs with cursor support
	const fetchFn = (cursor?: number) => {
		if (!selectedContainer) return Promise.resolve('')
		return getContainerLogs(selectedContainer.id, 100, cursor)
	}

	// Build resources list for LogsViewer select
	const resources = useMemo(() => {
		if (!containers) return []
		return containers.map(c => ({ id: c.id, name: c.name, type: 'container' }))
	}, [containers])

	const selectedResourceId = selectedContainer?.id

	const handleResourceChange = (resourceId: string) => {
		const container = containers?.find(c => c.id === resourceId)
		if (container) setSelectedContainer(container)
	}

	// Filtrar y ordenar contenedores
	const filteredContainers = useMemo(() => {
		if (!containers) return []

		return containers
			.filter((container) => {
				// Filtro por status
				if (statusFilter !== 'all') {
					const normalizedStatus = container.status.toLowerCase()
					if (statusFilter === 'running' && !normalizedStatus.startsWith('up')) {
						return false
					}
					if (statusFilter === 'stopped' && normalizedStatus.startsWith('up')) {
						return false
					}
					if (statusFilter === 'exited' && !normalizedStatus.startsWith('exited')) {
						return false
					}
				}
				// Filtro por búsqueda
				if (searchQuery) {
					const query = searchQuery.toLowerCase()
					return (
						container.id.toLowerCase().includes(query) ||
						container.name.toLowerCase().includes(query) ||
						container.status.toLowerCase().includes(query)
					)
				}
				return true
			})
			.sort((a, b) => a.name.localeCompare(b.name))
	}, [containers, statusFilter, searchQuery])

	// Expose refetch to parent
	useImperativeHandle(ref, () => ({
		refetch,
	}))

	const handleStart = async (containerId: string) => {
		await startContainer(containerId)
		queryClient.invalidateQueries({ queryKey: ["docker"] })
	}

	const handleRestart = async (containerId: string) => {
		await restartContainer(containerId)
		queryClient.invalidateQueries({ queryKey: ["docker"] })
	}

	const handleStop = async (containerId: string) => {
		await stopContainer(containerId)
		queryClient.invalidateQueries({ queryKey: ["docker"] })
	}

	const handleViewLogs = (container: ContainerInfo) => {
		console.log('[ContainerList] Opening logs for container:', container.name, 'ID:', container.id)
		setSelectedContainer(container)
		setIsLogsModalOpen(true)
	}

	if (isLoading) {
		return <StatusCard type="loading" message="Cargando contenedores..." />
	}

	if (!Array.isArray(filteredContainers) || filteredContainers.length === 0) {
		return (
			<StatusCard
				type="offline"
				message={searchQuery ? "No se encontraron contenedores que coincidan con la búsqueda." : "No hay contenedores disponibles."}
			/>
		)
	}

	return (
		<>
			<ContainersTable
				containers={filteredContainers}
				onStart={handleStart}
				onRestart={handleRestart}
				onStop={handleStop}
				onViewLogs={handleViewLogs}
			/>

			{isLogsModalOpen && selectedContainer &&
				createPortal(
					<LogsViewer
						key={selectedContainer.id}
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
})

function ContainersTable({
	containers,
	onStart,
	onRestart,
	onStop,
	onViewLogs,
}: {
	containers: ContainerInfo[]
	onStart: (containerId: string) => void
	onRestart: (containerId: string) => void
	onStop: (containerId: string) => void
	onViewLogs: (container: ContainerInfo) => void
}) {
	const columns: ColumnDef<ContainerInfo>[] = [
		{
			accessorKey: "name",
			header: "Contenedor",
			cell: ({ row }) => <ContainerNameCell container={row.original} />,
		},
		{
			accessorKey: "status",
			header: "Estado",
			cell: ({ row }) => <StatusCell container={row.original} />,
		},
		{
			accessorKey: "runningFor",
			header: "Iniciado",
			cell: ({ row }) => <StartedCell container={row.original} />,
		},
		{
			accessorKey: "ports",
			header: "Puertos",
			cell: ({ row }) => <PortsCell container={row.original} />,
		},
		{
			id: "actions",
			accessorKey: "actions",
			header: "Acciones",
			enableSorting: false,
			cell: ({ row }) => (
				<ActionsCell
					container={row.original}
					onStart={onStart}
					onRestart={onRestart}
					onStop={onStop}
					onViewLogs={onViewLogs}
				/>
			),
		},
	]

	return <Table columns={columns} data={containers} />
}

function ContainerNameCell({ container }: { container: ContainerInfo }) {
	return <span className="font-medium text-foreground text-sm">{container.name}</span>
}

function StatusCell({ container }: { container: ContainerInfo }) {
	const running = isRunning(container.status)

	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
				running
					? 'bg-success/20 text-success'
					: 'bg-muted text-muted-foreground'
			}`}
		>
			{running ? 'Running' : 'Stopped'}
		</span>
	)
}

function StartedCell({ container }: { container: ContainerInfo }) {
	const parseRunningTime = (runningFor?: string) => {
		if (!runningFor) return '-'
		return runningFor
	}

	return <span className="text-xs text-muted-foreground">{parseRunningTime(container.runningFor)}</span>
}

function PortsCell({ container }: { container: ContainerInfo }) {
	// Extract external ports using useMemo
	const externalPorts = useMemo(() => {
		if (!container.ports || container.ports === '') {
			return []
		}

		const ports = container.ports.split(', ')
		return ports
			.filter(p => p.includes('->') || p.includes(':'))
			.map(p => {
				const match = p.match(/(\d+)(?=\/tcp|$)/)
				return match ? match[1] : null
			})
			.filter(Boolean) as string[]
	}, [container.ports])

	// Initialize selected port from external ports
	const [selectedPort, setSelectedPort] = useState<string>(() => {
		if (!container.ports || container.ports === '') {
			return ''
		}

		const ports = container.ports.split(', ')
		const extPorts = ports
			.filter(p => p.includes('->') || p.includes(':'))
			.map(p => {
				const match = p.match(/(\d+)(?=\/tcp|$)/)
				return match ? match[1] : null
			})
			.filter(Boolean) as string[]

		return extPorts.length > 0 ? extPorts[0] : ''
	})

	const handlePortClick = (port: string) => {
		const portMatch = port.match(/(\d+)(?=\/tcp|$)/)
		if (portMatch) {
			const portNumber = portMatch[1]
			const url = `http://localhost:${portNumber}`
			window.open(url, '_blank')
		}
	}

	if (externalPorts.length === 0) {
		return <span className="text-muted-foreground">-</span>
	}

	return (
		<div className="flex items-center gap-2">
			<select
				value={selectedPort}
				onChange={(e) => setSelectedPort(e.target.value)}
				className="text-xs border border-input rounded-md px-2 py-1 bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all"
				aria-label="Seleccionar puerto"
			>
				{externalPorts.map((port, index) => (
					<option key={`${port}-${index}`} value={port}>
						:{port}
					</option>
				))}
			</select>
			<button
				type="button"
				onClick={() => handlePortClick(selectedPort)}
				className="p-1 text-primary hover:bg-primary/10 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
				title={`Abrir puerto ${selectedPort}`}
				aria-label={`Abrir puerto ${selectedPort}`}
				disabled={!selectedPort}
			>
				<ExternalLink className="w-4 h-4" />
			</button>
		</div>
	)
}

function ActionsCell({
	container,
	onStart,
	onRestart,
	onStop,
	onViewLogs,
}: {
	container: ContainerInfo
	onStart: (containerId: string) => void
	onRestart: (containerId: string) => void
	onStop: (containerId: string) => void
	onViewLogs: (container: ContainerInfo) => void
}) {
	const running = isRunning(container.status)

	return (
		<div className="flex items-center justify-end gap-1.5">
			<ActionButton
				action={ACTION_DEFINITIONS.viewLogs}
				onClick={() => onViewLogs(container)}
			/>
			<ActionButton
				action={ACTION_DEFINITIONS.startContainer}
				onClick={() => onStart(container.id)}
				disabled={running}
			/>
			<ActionButton
				action={ACTION_DEFINITIONS.restartContainer}
				onClick={() => onRestart(container.id)}
				disabled={!running}
			/>
			<ActionButton
				action={ACTION_DEFINITIONS.stopContainer}
				onClick={() => onStop(container.id)}
				disabled={!running}
			/>
		</div>
	)
}

function isRunning(status: string): boolean {
	return status.includes("Up")
}
