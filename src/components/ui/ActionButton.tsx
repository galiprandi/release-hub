import type { LucideIcon } from "lucide-react"
import { Loader2 } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"
export { ACTION_DEFINITIONS } from "./actionDefinitions"

export type ActionColor = "default" | "success" | "destructive" | "primary" | "warning" | "info"

export interface ActionDefinition {
	icon: LucideIcon
	label: string
	color?: ActionColor
	ariaLabel?: string
}

export interface ActionButtonProps {
	action: ActionDefinition
	onClick?: () => void
	disabled?: boolean
	loading?: boolean
	size?: "sm" | "md"
	tooltipSide?: "top" | "right" | "bottom" | "left"
	className?: string
	showLabel?: boolean
}

const colorClasses: Record<ActionColor, string> = {
	default: "text-muted-foreground hover:text-foreground hover:bg-accent",
	success: "text-success hover:bg-success/10",
	destructive: "text-destructive hover:bg-destructive/10",
	primary: "text-primary hover:bg-primary/10",
	warning: "text-warning hover:bg-warning/10",
	info: "text-info hover:bg-info/10",
}

const sizeClasses = {
	sm: "p-1",
	md: "p-1.5",
}

export function ActionButton({
	action,
	onClick,
	disabled = false,
	loading = false,
	size = "md",
	tooltipSide = "top",
	className = "",
	showLabel = false,
}: ActionButtonProps) {
	const colorClass = colorClasses[action.color || "default"]
	const sizeClass = sizeClasses[size]
	const ariaLabel = action.ariaLabel || action.label
	const isDisabled = disabled || loading

	return (
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<button
						type="button"
						onClick={onClick}
						disabled={isDisabled}
						className={`${sizeClass} ${colorClass} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 ${showLabel ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5' : ''} ${className}`}
						aria-label={ariaLabel}
					>
						{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <action.icon className="w-4 h-4" />}
						{showLabel && <span className="text-xs font-medium">{action.label}</span>}
					</button>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
						sideOffset={5}
						side={tooltipSide}
					>
						{loading ? "Procesando..." : action.label}
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	)
}
