import * as Tooltip from "@radix-ui/react-tooltip"
import { Circle } from "lucide-react"
import DayJS from "@/lib/dayjs"

interface DeployStatusIndicatorProps {
	status?: string
	updatedAt?: string
	failedStage?: string
	errorDetail?: string
	stage: "staging" | "production"
	isLoading?: boolean
}

export function DeployStatusIndicator({
	status,
	updatedAt,
	failedStage,
	errorDetail,
	stage,
	isLoading,
}: DeployStatusIndicatorProps) {
	// Siempre mostrar el indicador cuando se llama al componente

	const getStatusColor = () => {
		if (isLoading) return "text-gray-400"

		switch (status?.toLowerCase()) {
			case "success":
			case "completed":
				return "text-green-500"
			case "failed":
			case "error":
				return "text-red-500"
			case "in_progress":
			case "running":
			case "pending":
			case "started":
				return "text-yellow-500 animate-pulse-slow"
			case "warn":
			case "warning":
				return "text-orange-500"
			default:
				return "text-gray-400"
		}
	}

	const getTooltipContent = () => {
		if (isLoading) {
			return (
				<div className="text-xs space-y-1">
					<div className="font-medium">Cargando estado del deploy...</div>
				</div>
			)
		}

		if (!status) {
			return (
				<div className="text-xs space-y-1">
					<div className="font-medium">Sin datos de deploy</div>
					<div className="text-muted-foreground">
						No hay información del pipeline disponible
					</div>
				</div>
			)
		}

		switch (status?.toLowerCase()) {
			case "success":
			case "completed":
				return (
					<div className="text-xs space-y-1">
						<div className="font-medium">Deploy exitoso</div>
						{updatedAt && (
							<div className="text-muted-foreground">
								{DayJS(updatedAt).fromNow()}
							</div>
						)}
					</div>
				)
			case "failed":
			case "error":
				return (
					<div className="text-xs space-y-1">
						<div className="font-medium text-red-600">Deploy falló</div>
						{failedStage && (
							<div className="text-muted-foreground">
								Stage: {failedStage}
							</div>
						)}
						{errorDetail && (
							<div className="text-muted-foreground max-w-xs">
								{errorDetail}
							</div>
						)}
					</div>
				)
			case "in_progress":
			case "running":
			case "pending":
			case "started":
				return (
					<div className="text-xs space-y-1">
						<div className="font-medium">Deploy en progreso</div>
						<div className="text-muted-foreground">
							{stage === "staging" ? "Staging" : "Production"}
						</div>
					</div>
				)
			case "warn":
			case "warning":
				return (
					<div className="text-xs space-y-1">
						<div className="font-medium text-orange-600">Deploy con advertencias</div>
						{updatedAt && (
							<div className="text-muted-foreground">
								{DayJS(updatedAt).fromNow()}
							</div>
						)}
					</div>
				)
			default:
				return (
					<div className="text-xs space-y-1">
						<div className="font-medium">Estado desconocido</div>
						<div className="text-muted-foreground">
							Token vencido o no configurado
						</div>
					</div>
				)
		}
	}

	return (
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<span className="inline-flex items-center">
						<Circle className={`w-3 h-3 fill-current ${getStatusColor()}`} />
					</span>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-3 py-2 rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
						sideOffset={5}
					>
						{getTooltipContent()}
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	)
}
