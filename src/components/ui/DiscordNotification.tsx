import { useState } from "react"
import { Bell, Link, Eye, EyeOff } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"

interface DiscordNotificationProps {
	webhookUrl: string
	onWebhookChange?: (url: string) => void
	enabled: boolean
	onEnabledChange: (enabled: boolean) => void
	readonly?: boolean
}

export function DiscordNotification({
	webhookUrl,
	onWebhookChange,
	enabled,
	onEnabledChange,
	readonly = false,
}: DiscordNotificationProps) {
	const [showWebhook, setShowWebhook] = useState(false)

	return (
		<div className="border border-border rounded-md bg-muted/5 p-4">
			{/* Header with toggle */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Bell className="w-4 h-4 text-muted-foreground" />
					<span className="text-sm font-medium">Notificar en Discord</span>
				</div>
				{/* Switch */}
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							type="button"
							role="switch"
							aria-checked={enabled}
							aria-label="Notificar en Discord"
							onClick={() => webhookUrl && onEnabledChange(!enabled)}
							disabled={!webhookUrl}
							className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
								enabled ? "bg-primary" : "bg-muted"
							} disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1`}
						>
							<span
								className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
									enabled ? "translate-x-5" : "translate-x-1"
								}`}
							/>
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-3 py-2 rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 text-xs font-medium"
							sideOffset={5}
						>
							{!webhookUrl ? "Configura el webhook primero" : enabled ? "Desactivar notificaciones" : "Activar notificaciones"}
							<Tooltip.Arrow className="fill-popover" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</div>

			{/* Webhook input (always shown when not readonly and onWebhookChange exists) */}
			{!readonly && onWebhookChange && (
				<div className="mt-4 space-y-1.5">
					<label htmlFor="discord-webhook" className="text-xs font-medium text-muted-foreground flex items-center gap-2 ml-1">
						<Link className="w-3.5 h-3.5" />
						Webhook de Discord
					</label>
					<div className="relative">
						<input
							id="discord-webhook"
							type={showWebhook ? "text" : "password"}
							value={webhookUrl}
							onChange={(e) => onWebhookChange(e.target.value)}
							placeholder="https://discord.com/api/webhooks/..."
							className="w-full px-3 py-2 pr-10 text-xs bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
						/>
						<button
							type="button"
							onClick={() => setShowWebhook(!showWebhook)}
							className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
							aria-label={showWebhook ? "Ocultar webhook" : "Mostrar webhook"}
						>
							{showWebhook ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
						</button>
					</div>
					<p className="text-xs font-medium text-muted-foreground ml-1">
						URL del webhook de Discord para enviar notificaciones
					</p>
				</div>
			)}
		</div>
	)
}
