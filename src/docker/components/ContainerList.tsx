import { useState, forwardRef, useImperativeHandle, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Terminal as TerminalIcon } from "lucide-react"
import { getContainers, getContainerLogs, startContainer, restartContainer, stopContainer, type ContainerInfo } from "@/api/docker"
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys"
import { LogsViewer } from "@/components/shared/LogsViewer"
import { Terminal } from "@/components/shared/Terminal"
import { BaseDialog } from "@/components/ui/BaseDialog"
import { StatusCard } from "@/components/ui/StatusCard"
import { Table } from "@/components/ui/Table"
import { Boxes } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"

export interface ContainerListRef {
	refetch: () => void
}

interface ContainerListProps {
	searchQuery?: string
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
}

export const ContainerList = forwardRef<ContainerListRef, ContainerListProps>(({ searchQuery = '', activeFilter, onFilterChange }, ref) => {
	const queryClient = useQueryClient()
	const [selectedContainer, setSelectedContainer] = useState<ContainerInfo | null>(null)
	const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
	const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false)

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
		let result = [...containers]

		if (searchQuery) {
			const lowerQuery = searchQuery.toLowerCase()
			result = result.filter(c =>
				c.name.toLowerCase().includes(lowerQuery) ||
				c.image.toLowerCase().includes(lowerQuery)
			)
		}

		return result.sort((a, b) => a.name.localeCompare(b.name))
	}, [containers, searchQuery])

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
		setSelectedContainer(container)
		setIsLogsModalOpen(true)
	}

	const handleOpenTerminal = (container: ContainerInfo) => {
		setSelectedContainer(container)
		setIsTerminalModalOpen(true)
	}

	if (isLoading) {
		return <StatusCard type="loading" message="Cargando contenedores..." />
	}

	if (!Array.isArray(filteredContainers) || filteredContainers.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<div className="p-4 rounded-full bg-muted/30 border border-border mb-4">
					<Boxes className="w-8 h-8 text-muted-foreground" />
				</div>
				<h3 className="text-xs font-medium text-muted-foreground">
					{searchQuery ? "No se encontraron resultados" : "No hay contenedores"}
				</h3>
				<p className="text-xs text-muted-foreground mt-1 max-w-[300px] text-center">
					{searchQuery ? `No hay contenedores que coincidan con "${searchQuery}"` : "No se detectaron contenedores en este entorno."}
				</p>
			</div>
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
				onOpenTerminal={handleOpenTerminal}
				activeFilter={activeFilter}
				onFilterChange={onFilterChange}
			/>

			{isLogsModalOpen && selectedContainer &&
				createPortal(
					<LogsViewer
						key={`logs-${selectedContainer.id}`}
						fetchFn={fetchFn}
						onClose={() => setIsLogsModalOpen(false)}
						asModal={true}
						resources={resources}
						selectedResourceId={selectedResourceId}
						onResourceChange={handleResourceChange}
						context="docker"
						metadata={{
							imageTag: selectedContainer.image,
							restartCount: selectedContainer.restartCount,
						}}
					/>,
					document.body
				)
			}

			{isTerminalModalOpen && selectedContainer &&
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
									<span className="text-xs font-medium text-muted-foreground leading-none mb-1">Terminal</span>
									<span className="text-sm font-semibold tracking-tight leading-none">{selectedContainer.name}</span>
								</div>
							</div>
						}
						maxWidth="max-w-6xl"
						className="w-[90vw] h-[80vh] !p-0 overflow-hidden"
					>
						<div className="flex-1 min-h-0 bg-zinc-950 overflow-hidden">
							<Terminal
								type="docker"
								name={selectedContainer.name}
								className="border-none rounded-none h-full"
							/>
						</div>
					</BaseDialog>,
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
	onOpenTerminal,
	activeFilter,
	onFilterChange,
}: {
	containers: ContainerInfo[]
	onStart: (containerId: string) => void
	onRestart: (containerId: string) => void
	onStop: (containerId: string) => void
	onViewLogs: (container: ContainerInfo) => void
	onOpenTerminal: (container: ContainerInfo) => void
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
}) {
	const columns: ColumnDef<ContainerInfo>[] = useMemo(() => [
		{
			accessorKey: "name",
			header: "Contenedor",
			cell: ({ row }) => <ContainerNameCell container={row.original} />,
		},
		{
			id: "status",
			accessorFn: (row) => {
				const normalizedStatus = row.status.toLowerCase()
				if (normalizedStatus.startsWith('up')) return 'running'
				if (normalizedStatus.includes('exited')) return 'exited'
				return 'stopped'
			},
			header: "Estado",
			cell: ({ row }) => <StatusCell container={row.original} />,
			filterFn: 'equalsString',
		},
		{
			accessorKey: "image",
			header: () => <span className="text-xs font-medium text-muted-foreground">Image</span>,
			cell: ({ row }) => <ImageCell container={row.original} />,
		},
		{
			accessorKey: "restartCount",
			header: () => <span className="text-xs font-medium text-muted-foreground">Restarts</span>,
			cell: ({ row }) => <RestartsCell container={row.original} />,
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
					onOpenTerminal={onOpenTerminal}
				/>
			),
		},
	], [onStart, onRestart, onStop, onViewLogs, onOpenTerminal])

	return (
		<Table
			columns={columns}
			data={containers}
			activeFilter={activeFilter}
			onFilterChange={onFilterChange}
		/>
	)
}

function ContainerNameCell({ container }: { container: ContainerInfo }) {
	return <span className="font-medium text-foreground text-sm tracking-tight">{container.name}</span>
}

function StatusCell({ container }: { container: ContainerInfo }) {
	const status = container.status.toLowerCase()
	const running = status.startsWith('up')
	const exited = status.includes('exited')

	let colorClass = 'bg-muted/30 text-muted-foreground border-border'
	let dotClass = 'bg-muted-foreground/60'
	let label = 'Detenido'

	if (running) {
		colorClass = 'bg-success/20 text-success border-success/40'
		dotClass = 'bg-success  animate-pulse'
		label = 'OK'
	} else if (exited) {
		colorClass = 'bg-destructive/20 text-destructive border-destructive/40'
		dotClass = 'bg-destructive '
		label = 'ERROR'
	}

	return (
		<div className="flex items-center gap-2">
			<div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
			<span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${colorClass}`}>
				{label}
			</span>
		</div>
	)
}

function ImageCell({ container }: { container: ContainerInfo }) {
	const image = container.image || ''
	const lastColon = image.lastIndexOf(':')
	const hasTag = lastColon > 0 && !image.slice(lastColon + 1).includes('/')
	const imageName = hasTag ? image.slice(0, lastColon) : image
	const tag = hasTag ? image.slice(lastColon + 1) : 'latest'

	return (
		<div className="flex items-center gap-1 max-w-[200px] truncate">
			<span className="text-xs font-medium text-muted-foreground truncate">{imageName}</span>
			<span className="text-xs text-muted-foreground/60">:{tag}</span>
		</div>
	)
}

function RestartsCell({ container }: { container: ContainerInfo }) {
	const restarts = container.restartCount ?? 0

	if (restarts === 0) {
		return <span className="text-xs font-medium text-muted-foreground">0</span>
	}

	if (restarts > 5) {
		return (
			<div className="flex items-center gap-1.5">
				<span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
				<span className="text-xs font-medium text-destructive">{restarts}</span>
			</div>
		)
	}

	return <span className="text-xs font-medium text-warning">{restarts}</span>
}

function StartedCell({ container }: { container: ContainerInfo }) {
	const parseRunningTime = (runningFor?: string) => {
		if (!runningFor) return '-'
		return runningFor
	}

	return (
		<span className="text-xs font-medium text-muted-foreground">
			{parseRunningTime(container.runningFor)}
		</span>
	)
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
		<div className="flex items-center gap-1.5">
			<select
				value={selectedPort}
				onChange={(e) => setSelectedPort(e.target.value)}
				className="text-xs font-medium border border-border rounded-lg px-2 py-1 bg-muted/30 hover:bg-muted/30 transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1 cursor-pointer"
				aria-label="Seleccionar puerto"
			>
				{externalPorts.map((port, index) => (
					<option key={`${port}-${index}`} value={port}>
						:{port}
					</option>
				))}
			</select>
			<ActionButton
				action={ACTION_DEFINITIONS.openPort}
				onClick={() => handlePortClick(selectedPort)}
				disabled={!selectedPort}
				tooltipSide="top"
			/>
		</div>
	)
}

function ActionsCell({
	container,
	onStart,
	onRestart,
	onStop,
	onViewLogs,
	onOpenTerminal,
}: {
	container: ContainerInfo
	onStart: (containerId: string) => void
	onRestart: (containerId: string) => void
	onStop: (containerId: string) => void
	onViewLogs: (container: ContainerInfo) => void
	onOpenTerminal: (container: ContainerInfo) => void
}) {
	const running = isRunning(container.status)

	return (
		<div className="flex items-center justify-end gap-1.5">
			<div className="flex items-center gap-1">
				<ActionButton
					action={ACTION_DEFINITIONS.viewLogs}
					onClick={() => onViewLogs(container)}
				/>
				<ActionButton
					action={ACTION_DEFINITIONS.openTerminal}
					onClick={() => onOpenTerminal(container)}
					disabled={!running}
				/>
			</div>

			<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
				<div className="w-px h-4 bg-border mx-1" aria-hidden="true" />
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
		</div>
	)
}

function isRunning(status: string): boolean {
	return status.includes("Up")
}
