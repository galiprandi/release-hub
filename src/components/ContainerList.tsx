import { useState, forwardRef, useImperativeHandle, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Play, RefreshCw, Square, Terminal, ExternalLink } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { getContainers, getContainerLogs, startContainer, restartContainer, stopContainer, type ContainerInfo } from "@/api/docker"
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys"
import { LogsViewer } from "@/components/shared/LogsViewer"

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
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				Cargando contenedores...
			</div>
		)
	}

	if (!Array.isArray(filteredContainers) || filteredContainers.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
				<Terminal className="w-12 h-12 mb-4 opacity-50" />
				<p>No hay contenedores disponibles</p>
			</div>
		)
	}

	return (
		<>
			<div className="border rounded-lg overflow-hidden">
				<table className="w-full table-fixed">
					<thead className="bg-muted">
						<tr>
							<th className="text-left p-3 text-sm font-medium w-[25%]">Contenedor</th>
							<th className="text-left p-3 text-sm font-medium w-[15%]">Estado</th>
							<th className="text-left p-3 text-sm font-medium w-[20%]">Iniciado</th>
							<th className="text-left p-3 text-sm font-medium w-[25%]">Puertos</th>
							<th className="text-right p-3 text-sm font-medium w-[15%]">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{filteredContainers.map((container) => (
							<ContainerRow
								key={container.id}
								container={container}
								onStart={() => handleStart(container.id)}
								onRestart={() => handleRestart(container.id)}
								onStop={() => handleStop(container.id)}
								onViewLogs={() => handleViewLogs(container)}
							/>
						))}
					</tbody>
				</table>
			</div>

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

function ContainerRow({
	container,
	onStart,
	onRestart,
	onStop,
	onViewLogs,
}: {
	container: ContainerInfo
	onStart: () => void
	onRestart: () => void
	onStop: () => void
	onViewLogs: () => void
}) {
	const running = isRunning(container.status)

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

	const renderPorts = () => {
		if (externalPorts.length === 0) {
			return <span className="text-muted-foreground">-</span>
		}

		return (
			<div className="flex items-center gap-2">
				<select
					value={selectedPort}
					onChange={(e) => setSelectedPort(e.target.value)}
					className="text-xs border rounded px-2 py-1 bg-background"
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
					className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
					title={`Abrir puerto ${selectedPort}`}
					disabled={!selectedPort}
				>
					<ExternalLink className="w-4 h-4" />
				</button>
			</div>
		)
	}

	const parseRunningTime = (runningFor?: string) => {
		if (!runningFor) return '-'
		return runningFor
	}

	return (
		<tr className="border-b hover:bg-muted/50 transition-colors">
			<td className="p-3 font-medium">{container.name}</td>
			<td className="p-3">
				<span
					className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
						running
							? 'bg-green-100 text-green-800'
							: 'bg-gray-100 text-gray-800'
					}`}
				>
					{running ? 'Running' : 'Stopped'}
				</span>
			</td>
			<td className="p-3 text-xs text-muted-foreground">{parseRunningTime(container.runningFor)}</td>
			<td className="p-3 text-xs">{renderPorts()}</td>
			<td className="p-3">
				<div className="flex items-center justify-end gap-2">
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="button"
									onClick={onViewLogs}
									className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
									aria-label="Ver logs"
								>
									<Terminal className="w-4 h-4" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
									sideOffset={5}
								>
									Ver logs
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="button"
									onClick={onStart}
									className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-green-600"
									disabled={running}
									aria-label="Iniciar contenedor"
								>
									<Play className="w-4 h-4" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
									sideOffset={5}
								>
									Iniciar contenedor
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="button"
									onClick={onRestart}
									className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
									disabled={!running}
									aria-label="Reiniciar contenedor"
								>
									<RefreshCw className="w-4 h-4" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
									sideOffset={5}
								>
									Reiniciar contenedor
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="button"
									onClick={onStop}
									className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-600"
									disabled={!running}
									aria-label="Detener contenedor"
								>
									<Square className="w-4 h-4" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
									sideOffset={5}
								>
									Detener contenedor
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
					</Tooltip.Provider>
				</div>
			</td>
		</tr>
	)
}

function isRunning(status: string): boolean {
	return status.includes("Up")
}
