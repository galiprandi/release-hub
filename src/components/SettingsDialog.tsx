import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { Settings, X, Trash2, Save, RefreshCw } from "lucide-react"
import { useSettings } from "@/hooks/useSettings"
import { useToken } from "@/hooks/useToken"

export function SettingsDialog() {
	const queryClient = useQueryClient()
	const { settings, setSekiToken, setDiscordWebhook, isUpdating } = useSettings()
	const { saveToken: saveSekiToken, clearToken: clearSekiToken, isExpired, expirationDate } = useToken()
	const [open, setOpen] = useState(false)
	const [sekiTokenInput, setSekiTokenInput] = useState("")
	const [discordWebhookInput, setDiscordWebhookInput] = useState("")
	const [isClearingCache, setIsClearingCache] = useState(false)

	const handleSaveSekiToken = () => {
		if (sekiTokenInput.trim()) {
			const cleanToken = sekiTokenInput.trim().replace(/^(Bearer|bearer)\s+/, "")
			saveSekiToken(cleanToken)
			setSekiToken(cleanToken)
			setSekiTokenInput("")
		}
	}

	const handleClearSekiToken = () => {
		clearSekiToken()
		setSekiToken(null)
	}

	const handleSaveDiscordWebhook = () => {
		if (discordWebhookInput.trim()) {
			setDiscordWebhook(discordWebhookInput.trim())
			setDiscordWebhookInput("")
		}
	}

	const handleClearDiscordWebhook = () => {
		setDiscordWebhook(null)
	}

	const handleClearCache = async () => {
		setIsClearingCache(true)
		try {
			queryClient.clear()
			// Small delay for visual feedback
			await new Promise(resolve => setTimeout(resolve, 500))
		} finally {
			setIsClearingCache(false)
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (newOpen) {
			// Pre-fill inputs with current values
			setSekiTokenInput("")
			setDiscordWebhookInput("")
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<div
				className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
				title="Configuración"
				onClick={(e) => {
					e.stopPropagation();
					e.preventDefault();
					setOpen(true);
				}}
				onPointerDown={(e) => {
					e.stopPropagation();
					e.preventDefault();
					// Blur any focused input to prevent autocomplete
					if (document.activeElement instanceof HTMLElement) {
						document.activeElement.blur();
					}
				}}
				onMouseDown={(e) => {
					e.stopPropagation();
					e.preventDefault();
				}}
			>
				<Settings className="w-5 h-5" />
			</div>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg max-h-[85vh] bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col">
					<Dialog.Description className="sr-only">
						Configuración de ReleaseHub
					</Dialog.Description>

					{/* Header */}
					<div className="flex items-center justify-between mb-6 flex-shrink-0">
						<Dialog.Title className="text-lg font-semibold flex items-center gap-2">
							<Settings className="w-5 h-5" />
							Configuración
						</Dialog.Title>
						<Dialog.Close asChild>
							<button
								type="button"
								className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
							>
								<X className="w-4 h-4" />
								<span className="sr-only">Cerrar</span>
							</button>
						</Dialog.Close>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto space-y-6">
						{/* Seki Token Section */}
						<section className="space-y-3">
							<div className="pb-3 border-b">
								<h3 className="font-semibold text-sm">Token de Seki</h3>
								<p className="text-xs text-muted-foreground">
									Token JWT para acceder a pipelines de Seki
								</p>
							</div>

							{settings.sekiToken ? (
								<div className="space-y-3">
									<div className="bg-muted/50 rounded-lg p-3 space-y-2">
										<div className="flex items-center gap-2 text-sm">
											<span className={`${isExpired ? 'text-red-600' : 'text-green-600'} font-medium`}>
												{isExpired ? '● Token expirado' : '● Token configurado'}
											</span>
										</div>
										{expirationDate && (
											<p className={`text-xs ${isExpired ? 'text-red-600' : 'text-muted-foreground'}`}>
												{expirationDate}
											</p>
										)}
									</div>
									
									<button
										type="button"
										onClick={handleClearSekiToken}
										className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors w-full justify-center"
									>
										<Trash2 className="w-3.5 h-3.5" />
										Revocar acceso
									</button>
								</div>
							) : (
								<div className="space-y-2">
									<div>
										<label className="text-xs font-medium block mb-1.5">Token JWT</label>
										<div className="flex gap-2">
											<input
												type="password"
												value={sekiTokenInput}
												onChange={(e) => setSekiTokenInput(e.target.value)}
												placeholder="eyJhbGciOiJSUzUxMiIsInR5cCI6IkJlYXJlciJ9..."
												className="flex-1 px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
											/>
											<button
												type="button"
												onClick={handleSaveSekiToken}
												disabled={!sekiTokenInput.trim() || isUpdating}
												className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
											>
												<Save className="w-3 h-3" />
												Guardar
											</button>
										</div>
									</div>
									<p className="text-[10px] text-muted-foreground">
										El token se almacena localmente en tu navegador.
									</p>
								</div>
							)}
						</section>

						{/* Discord Webhook Section */}
						<section className="space-y-3">
							<div className="pb-3 border-b">
								<h3 className="font-semibold text-sm">Webhook de Discord</h3>
								<p className="text-xs text-muted-foreground">
									URL global para notificaciones
								</p>
							</div>

							{settings.discordWebhook ? (
								<div className="space-y-3">
									<div className="bg-muted/50 rounded-lg p-3 space-y-2">
										<div className="flex items-center gap-2 text-sm">
											<span className="text-green-600 font-medium">● Webhook configurado</span>
										</div>
										<p className="text-xs text-muted-foreground font-mono break-all">
											{settings.discordWebhook.slice(0, 50)}...
										</p>
									</div>
									
									<button
										type="button"
										onClick={handleClearDiscordWebhook}
										className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors w-full justify-center"
									>
										<Trash2 className="w-3.5 h-3.5" />
										Eliminar webhook
									</button>
								</div>
							) : (
								<div className="space-y-2">
									<div>
										<label className="text-xs font-medium block mb-1.5">URL del Webhook</label>
										<div className="flex gap-2">
											<input
												type="text"
												value={discordWebhookInput}
												onChange={(e) => setDiscordWebhookInput(e.target.value)}
												placeholder="https://discord.com/api/webhooks/..."
												className="flex-1 px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
											/>
											<button
												type="button"
												onClick={handleSaveDiscordWebhook}
												disabled={!discordWebhookInput.trim() || isUpdating}
												className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
											>
												<Save className="w-3 h-3" />
												Guardar
											</button>
										</div>
									</div>
								</div>
							)}
						</section>

						{/* Clear Cache Section */}
						<section className="space-y-3">
							<div className="pb-3 border-b">
								<h3 className="font-semibold text-sm">Limpiar Caché</h3>
								<p className="text-xs text-muted-foreground">
									Invalidar todos los datos en caché
								</p>
							</div>

							<button
								type="button"
								onClick={handleClearCache}
								disabled={isClearingCache}
								className="flex items-center gap-2 text-xs bg-muted hover:bg-muted/80 px-3 py-2 rounded-md transition-colors w-full justify-center disabled:opacity-50"
							>
								{isClearingCache ? (
									<>
										<RefreshCw className="w-3.5 h-3.5 animate-spin" />
										Limpiando...
									</>
								) : (
									<>
										<RefreshCw className="w-3.5 h-3.5" />
										Limpiar todo el caché
									</>
								)}
							</button>
						</section>
					</div>

					{/* Footer */}
					<div className="mt-6 pt-4 border-t flex-shrink-0">
						<Dialog.Close asChild>
							<button className="w-full px-4 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
								Cerrar
							</button>
						</Dialog.Close>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
