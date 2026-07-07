import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { Settings, Trash2, Save, RefreshCw, Eye, EyeOff } from "lucide-react"
import { useSettings } from "@/hooks/useSettings"
import { useToken } from "@/hooks/useToken"
import { BaseDialog } from "@/components/ui/BaseDialog"

export function SettingsDialog({ showTrigger = true, open: controlledOpen, onOpenChange }: { showTrigger?: boolean, open?: boolean, onOpenChange?: (open: boolean) => void }) {
	const queryClient = useQueryClient()
	const { settings, setSekiToken, setDiscordWebhook, isUpdating } = useSettings()
	const { saveToken: saveSekiToken, clearToken: clearSekiToken, isExpired, expirationDate } = useToken()
	const [internalOpen, setInternalOpen] = useState(false)
	const open = controlledOpen !== undefined ? controlledOpen : internalOpen
	const setOpen = onOpenChange || setInternalOpen
	const [sekiTokenInput, setSekiTokenInput] = useState("")
	const [discordWebhookInput, setDiscordWebhookInput] = useState("")
	const [showSekiToken, setShowSekiToken] = useState(false)
	const [showDiscordWebhook, setShowDiscordWebhook] = useState(false)
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
			setShowSekiToken(false)
			setShowDiscordWebhook(false)
		}
	}

	return (
		<>
			{showTrigger && (
				<button
					type="button"
					className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg"
					title="Configuración"
					aria-label="Configuración"
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
				</button>
			)}
			<BaseDialog
				open={open}
				onOpenChange={handleOpenChange}
				title={<div className="flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> <span>Configuración</span></div>}
				description="Panel de configuración técnica y ambiental de ReleaseHub."
				maxWidth="max-w-lg"
			>
				{/* Content */}
				<div className="flex-1 overflow-y-auto space-y-8 py-2 scrollbar-hide">
					{/* Seki Token Section */}
					<section className="space-y-4">
						<div className="pb-3 border-b border-border/40">
							<h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Token de Seki</h3>
							<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mt-1">
								Autenticación técnica para el núcleo de pipelines
							</p>
						</div>

						{settings.sekiToken ? (
							<div className="space-y-3">
								<div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2">
									<div className="flex items-center gap-2">
										<div className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-destructive animate-pulse' : 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`} />
										<span className={`text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'text-destructive' : 'text-success'}`}>
											{isExpired ? 'Token expirado' : 'Token activo'}
										</span>
									</div>
									{expirationDate && (
										<p className={`text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'text-destructive/60' : 'text-muted-foreground/60'}`}>
											Expira: {expirationDate}
										</p>
									)}
								</div>

								<button
									type="button"
									onClick={handleClearSekiToken}
									className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 px-4 py-2 rounded-lg border border-transparent hover:border-destructive/20 transition-all w-full"
								>
									<Trash2 className="w-3.5 h-3.5" />
									Revocar Acceso
								</button>
							</div>
						) : (
							<div className="space-y-3">
								<div className="space-y-1.5">
									<label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 ml-1">Token JWT</label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<input
												type={showSekiToken ? "text" : "password"}
												value={sekiTokenInput}
												onChange={(e) => setSekiTokenInput(e.target.value)}
												placeholder="eyJhbGciOiJSUzUxMiIsInR5cCI6IkJlYXJlciJ9..."
												className="w-full px-3 py-2 pr-10 text-xs bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
											/>
											<button
												type="button"
												onClick={() => setShowSekiToken(!showSekiToken)}
												className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
												aria-label={showSekiToken ? "Ocultar token" : "Mostrar token"}
											>
												{showSekiToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
											</button>
										</div>
										<button
											type="button"
											onClick={handleSaveSekiToken}
											disabled={!sekiTokenInput.trim() || isUpdating}
											className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
										>
											<Save className="w-3.5 h-3.5" />
											Guardar
										</button>
									</div>
								</div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-center">
									Persistencia local en el entorno del navegador
								</p>
							</div>
						)}
					</section>

					{/* Discord Webhook Section */}
					<section className="space-y-4">
						<div className="pb-3 border-b border-border/40">
							<h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Notificaciones Discord</h3>
							<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mt-1">
								Canal global de eventos y alertas técnicas
							</p>
						</div>

						{settings.discordWebhook ? (
							<div className="space-y-3">
								<div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2">
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
										<span className="text-[10px] font-bold uppercase tracking-wider text-success">Webhook configurado</span>
									</div>
									<p className="text-[10px] font-mono text-muted-foreground/60 break-all leading-relaxed">
										{settings.discordWebhook.slice(0, 50)}...
									</p>
								</div>

								<button
									type="button"
									onClick={handleClearDiscordWebhook}
									className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 px-4 py-2 rounded-lg border border-transparent hover:border-destructive/20 transition-all w-full"
								>
									<Trash2 className="w-3.5 h-3.5" />
									Eliminar Webhook
								</button>
							</div>
						) : (
							<div className="space-y-1.5">
								<label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 ml-1">URL del Webhook</label>
								<div className="flex gap-2">
									<div className="relative flex-1">
										<input
											type={showDiscordWebhook ? "text" : "password"}
											value={discordWebhookInput}
											onChange={(e) => setDiscordWebhookInput(e.target.value)}
											placeholder="https://discord.com/api/webhooks/..."
											className="w-full px-3 py-2 pr-10 text-xs bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
										/>
										<button
											type="button"
											onClick={() => setShowDiscordWebhook(!showDiscordWebhook)}
											className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
											aria-label={showDiscordWebhook ? "Ocultar webhook" : "Mostrar webhook"}
										>
											{showDiscordWebhook ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
										</button>
									</div>
									<button
										type="button"
										onClick={handleSaveDiscordWebhook}
										disabled={!discordWebhookInput.trim() || isUpdating}
										className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
									>
										<Save className="w-3.5 h-3.5" />
										Guardar
									</button>
								</div>
							</div>
						)}
					</section>

					{/* Clear Cache Section */}
					<section className="space-y-4">
						<div className="pb-3 border-b border-border/40">
							<h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Gestión de Datos</h3>
							<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mt-1">
								Invalidación de caché y resincronización global
							</p>
						</div>

						<button
							type="button"
							onClick={handleClearCache}
							disabled={isClearingCache}
							className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-muted hover:bg-muted/80 px-4 py-3 rounded-xl border border-border/40 transition-all w-full disabled:opacity-50 group focus:outline-none focus:ring-2 focus:ring-primary/20"
						>
							{isClearingCache ? (
								<>
									<RefreshCw className="w-4 h-4 animate-spin text-primary" />
									<span>Purgando Registros...</span>
								</>
							) : (
								<>
									<RefreshCw className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
									<span>Limpiar Caché Global</span>
								</>
							)}
						</button>
					</section>
				</div>

				{/* Footer */}
				<div className="mt-8 pt-4 border-t border-border/40 flex-shrink-0">
					<Dialog.Close asChild>
						<button className="w-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/20">
							Finalizar
						</button>
					</Dialog.Close>
				</div>
			</BaseDialog>
		</>
	)
}
