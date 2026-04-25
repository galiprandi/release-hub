import { Bell, Link } from "lucide-react"
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
	return (
		<div className="border rounded-md p-4">
			{/* Header with toggle */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Bell className="w-4 h-4 text-muted-foreground" />
					<span className="text-sm font-medium">Notificar en Discord</span>
				</div>
				{/* Switch */}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<button
								type="button"
								onClick={() => webhookUrl && onEnabledChange(!enabled)}
								disabled={!webhookUrl}
								className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
									enabled ? "bg-primary" : "bg-muted"
								} disabled:opacity-50 disabled:cursor-not-allowed`}
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
								className="bg-popover text-popover-foreground border px-3 py-2 rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
								sideOffset={5}
							>
								{!webhookUrl ? "Configura el webhook primero" : enabled ? "Desactivar notificaciones" : "Activar notificaciones"}
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
				</Tooltip.Provider>
			</div>

			{/* Webhook input (always shown when not readonly and onWebhookChange exists) */}
			{!readonly && onWebhookChange && (
				<div className="mt-4 space-y-2">
					<label htmlFor="discord-webhook" className="block text-sm font-medium flex items-center gap-2">
						<Link className="w-4 h-4 text-muted-foreground" />
						Webhook de Discord
					</label>
					<input
						id="discord-webhook"
						type="text"
						value={webhookUrl}
						onChange={(e) => onWebhookChange(e.target.value)}
						placeholder="https://discord.com/api/webhooks/..."
						className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
					/>
					<p className="text-xs text-muted-foreground">
						URL del webhook de Discord para enviar notificaciones
					</p>
				</div>
			)}
		</div>
	)
}
