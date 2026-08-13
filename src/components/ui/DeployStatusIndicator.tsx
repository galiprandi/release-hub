import * as Tooltip from "@radix-ui/react-tooltip"
import { CheckCircle, XCircle, Loader2, AlertTriangle, HelpCircle, Circle } from "lucide-react"
import DayJS from "@/lib/dayjs"

interface DeployStatusIndicatorProps {
	status?: string
	updatedAt?: string
	failedStage?: string
	errorDetail?: string
	stage: "staging" | "production"
	isLoading?: boolean
	commitInfo?: {
		hash?: string
		shortHash?: string
		author?: string
		date?: string
		message?: string
	}
	tagInfo?: {
		name?: string
		commit?: string
	}
}

export function DeployStatusIndicator({
	status,
	updatedAt,
	failedStage,
	errorDetail,
	stage,
	isLoading,
	commitInfo,
	tagInfo,
}: DeployStatusIndicatorProps) {
	// Siempre mostrar el indicador cuando se llama al componente

	const getStatusConfig = () => {
		if (isLoading) {
			return {
				icon: Loader2,
				iconProps: { className: "animate-spin" },
				badgeClass: "bg-muted/30 text-muted-foreground",
				label: "Cargando"
			}
		}

		switch (status?.toLowerCase()) {
			case "success":
			case "completed":
				return {
					icon: CheckCircle,
					iconProps: {},
					badgeClass: "bg-success/20 text-success",
					label: "Success"
				}
			case "failed":
			case "error":
				return {
					icon: XCircle,
					iconProps: {},
					badgeClass: "bg-destructive/20 text-destructive",
					label: "Failed"
				}
			case "in_progress":
			case "running":
			case "pending":
			case "started":
				return {
					icon: Loader2,
					iconProps: { className: "animate-spin" },
					badgeClass: "bg-info/20 text-info",
					label: "Deploying"
				}
			case "warn":
			case "warning":
				return {
					icon: AlertTriangle,
					iconProps: {},
					badgeClass: "bg-warning/20 text-warning",
					label: "Warning"
				}
			case "idle":
				return {
					icon: Circle,
					iconProps: {},
					badgeClass: "bg-muted/30 text-muted-foreground",
					label: "Idle"
				}
			default:
				return {
					icon: HelpCircle,
					iconProps: {},
					badgeClass: "bg-muted/30 text-muted-foreground",
					label: "Unknown"
				}
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
					<div className="text-xs space-y-2">
						<div className="font-medium">Deploy exitoso</div>
						{updatedAt && (
							<div className="text-muted-foreground">
								{DayJS(updatedAt).fromNow()}
							</div>
						)}
						{tagInfo?.name && (
							<div className="text-muted-foreground">
								Tag: {tagInfo.name}
							</div>
						)}
						{commitInfo?.author && (
							<div className="text-muted-foreground">
								Por: {commitInfo.author}
							</div>
						)}
						{commitInfo?.message && (
							<div className="text-muted-foreground italic max-w-xs truncate">
								{commitInfo.message}
							</div>
						)}
					</div>
				)
			case "failed":
			case "error":
				return (
					<div className="text-xs space-y-2">
						<div className="font-medium text-destructive">Deploy falló</div>
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
						{tagInfo?.name && (
							<div className="text-muted-foreground">
								Tag: {tagInfo.name}
							</div>
						)}
						{commitInfo?.author && (
							<div className="text-muted-foreground">
								Por: {commitInfo.author}
							</div>
						)}
					</div>
				)
			case "in_progress":
			case "running":
			case "pending":
			case "started":
				return (
					<div className="text-xs space-y-2">
						<div className="font-medium">Deploy en progreso</div>
						<div className="text-muted-foreground">
							{stage === "staging" ? "Staging" : "Production"}
						</div>
						{commitInfo?.shortHash && (
							<div className="text-muted-foreground">
								Commit: {commitInfo.shortHash}
							</div>
						)}
						{commitInfo?.author && (
							<div className="text-muted-foreground">
								Por: {commitInfo.author}
							</div>
						)}
					</div>
				)
			case "warn":
			case "warning":
				return (
					<div className="text-xs space-y-2">
						<div className="font-medium text-warning">Deploy con advertencias</div>
						{updatedAt && (
							<div className="text-muted-foreground">
								{DayJS(updatedAt).fromNow()}
							</div>
						)}
						{tagInfo?.name && (
							<div className="text-muted-foreground">
								Tag: {tagInfo.name}
							</div>
						)}
						{commitInfo?.author && (
							<div className="text-muted-foreground">
								Por: {commitInfo.author}
							</div>
						)}
					</div>
				)
			case "idle":
				return (
					<div className="text-xs space-y-1">
						<div className="font-medium">Pipeline sin ejecutar</div>
						<div className="text-muted-foreground">
							El pipeline aún no ha iniciado
						</div>
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

	// Don't show anything if no status and not loading
	if (!status && !isLoading) {
		return null
	}

	const config = getStatusConfig()
	const StatusIcon = config.icon

	return (
		<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<span className={`inline-flex items-center justify-center w-5 h-5 rounded-md border border-current/20 ${config.badgeClass}`}>
						<StatusIcon className="w-3 h-3" {...config.iconProps} />
					</span>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-3 py-2 rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 text-xs font-medium"
						sideOffset={5}
					>
						{getTooltipContent()}
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
	)
}
