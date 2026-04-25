import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Unlock, Lock, X, Loader2, CheckCircle2 } from "lucide-react"
import { runCommand } from "@/api/exec"
import { useBranchProtection } from "@/hooks/useBranchProtection"
import { useDiscordChannel } from "@/hooks/useDiscordChannel"
import { useGitUser } from "@/hooks/useGitUser"
import { DiscordNotification } from "@/components/ui/DiscordNotification"

interface FreezeDialogProps {
	repo: string
	iconOnly?: boolean
}

type Step = 'config' | 'success'

export function FreezeDialog({ repo, iconOnly = false }: FreezeDialogProps) {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<Step>('config')
	const [isToggling, setIsToggling] = useState(false)
	const [error, setError] = useState("")
	const { webhookUrl } = useDiscordChannel(repo)
	const [notificationsEnabled, setNotificationsEnabled] = useState(!!webhookUrl)
	const { data: gitUser } = useGitUser()

	const { data: protectionStatus } = useBranchProtection({ repo })
	const isLocked = protectionStatus?.isLocked || false
	const canManage = protectionStatus?.canManage || false

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (newOpen) {
			setStep('config')
			setNotificationsEnabled(!!webhookUrl)
			setError("")
		}
	}

	const handleToggleFreeze = async () => {
		setIsToggling(true)
		setError("")
		try {
			const tokenResult = await runCommand('gh auth token')
			const token = tokenResult.stdout.trim()
			if (!token) throw new Error("Sin token de GitHub configurado en gh CLI")

			// Build protection config
			const protectionConfig = {
				lock_branch: !isLocked,
				enforce_admins: false,
				required_pull_request_reviews: null,
				required_status_checks: null,
				restrictions: null,
			}

			const result = await runCommand(
				`gh api repos/${repo}/branches/main/protection --method PUT --input - << 'EOF'
${JSON.stringify(protectionConfig)}
EOF`
			)

			if (result.stderr) {
				throw new Error(result.stderr)
			}

			// Send Discord notification if enabled and webhook is configured
			if (notificationsEnabled && webhookUrl) {
				await sendDiscordNotification(webhookUrl, repo, !isLocked)
			}

			queryClient.invalidateQueries({ queryKey: ['branch', 'protection', repo] })
			setStep('success')
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al cambiar estado del freeze")
		} finally {
			setIsToggling(false)
		}
	}

	const sendDiscordNotification = async (webhookUrl: string, repo: string, isFreezing: boolean) => {
		try {
			const timestamp = new Date().toISOString()
			const userName = gitUser?.name || "Unknown"

			const embed = {
				title: isFreezing ? "🔒 Code Freeze Activado" : "🔓 Code Freeze Desactivado",
				description: isFreezing
					? `El branch \`main\` de \`${repo}\` ha sido bloqueado temporalmente ${userName} desde ReleaseHub.`
					: `El branch \`main\` de \`${repo}\` ha sido desbloqueado ${userName} desde ReleaseHub.`,
				color: isFreezing ? 15158332 : 3066993, // Red for freeze, Green for unfreeze
				timestamp,
				footer: {
					text: "ReleaseHub - Code Freeze",
				},
			}

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					embeds: [embed],
				}),
			})

			if (!response.ok) {
				throw new Error(`Discord webhook failed: ${response.statusText}`)
			}
		} catch (err) {
			console.error('Error sending Discord notification:', err)
		}
	}

	const dialogWidth = step === 'success' ? 'max-w-sm' : 'max-w-lg'

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<Dialog.Trigger asChild>
							<button
								type="button"
								disabled={!canManage}
								className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
									isLocked
										? "bg-orange-600 text-white hover:bg-orange-700"
										: "bg-slate-400 text-white hover:bg-slate-500"
								} disabled:opacity-50 disabled:cursor-not-allowed`}
							>
								{isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
								{!iconOnly && <span>{isLocked ? "Desbloquear" : "Bloquear"}</span>}
							</button>
						</Dialog.Trigger>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-3 py-2 rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
							sideOffset={5}
						>
							<div className="text-xs space-y-1">
								{canManage ? (
									<>
										<div className="font-medium">{isLocked ? "Desbloquear branch" : "Bloquear branch main"}</div>
										<div className="text-muted-foreground">
											{isLocked ? "Permitir merges y pushes a main" : "Bloquear merges y pushes a main"}
										</div>
									</>
								) : (
									<div className="text-muted-foreground">No tienes permisos para gestionar bloqueo</div>
								)}
							</div>
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className={`fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full ${dialogWidth} max-h-[80vh] bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col transition-all duration-200`}>
					<Dialog.Description className="sr-only">
						Gestión de bloqueo
					</Dialog.Description>

					{/* Header */}
					<div className="flex items-center justify-between mb-4 flex-shrink-0">
						<Dialog.Title className="text-lg font-semibold flex items-center gap-2">
							{step === 'config' && <>{isLocked ? <Lock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {isLocked ? "Desbloquear Branch" : "Bloquear Branch"}</>}
							{step === 'success' && <><CheckCircle2 className="w-4 h-4 text-green-600" /> {isLocked ? "Branch Desbloqueado" : "Branch Bloqueado"}</>}
						</Dialog.Title>
						<div className="flex items-center gap-2">
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
					</div>

					{/* Step 1: Config */}
					{step === 'config' && (
						<div className="flex flex-col flex-1 overflow-y-auto">
							<div className="space-y-4">
								<div className="text-sm">
									{isLocked ? (
										<p>Vas a <strong>desbloquear</strong> el branch main de <code className="font-mono bg-muted px-1 rounded">{repo}</code>. Esto permitirá merges y pushes nuevamente.</p>
									) : (
										<p>Vas a <strong>bloquear</strong> el branch main de <code className="font-mono bg-muted px-1 rounded">{repo}</code>. Esto bloqueará todos los merges y pushes hasta que lo desbloquees.</p>
									)}
								</div>

								<DiscordNotification
									webhookUrl={webhookUrl}
									enabled={notificationsEnabled}
									onEnabledChange={setNotificationsEnabled}
									readonly
								/>

								{error && <p className="text-sm text-red-600">{error}</p>}
							</div>

							<div className="mt-4 pt-4 border-t flex justify-end flex-shrink-0">
								<button
									onClick={handleToggleFreeze}
									disabled={isToggling}
									className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 ${
										isLocked ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
									}`}
								>
									{isToggling ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <>{isLocked ? <><Lock className="w-4 h-4" /> Desbloquear</> : <><Lock className="w-4 h-4" /> Bloquear</>}</>}
								</button>
							</div>
						</div>
					)}

					{/* Step 2: Success */}
					{step === 'success' && (
						<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
							<CheckCircle2 className="w-12 h-12 text-green-600" />
							<div>
								<p className="text-lg font-semibold">{isLocked ? "Branch Desbloqueado" : "Branch Bloqueado"}</p>
								<p className="text-sm text-muted-foreground mt-1">
									{isLocked ? "El branch main de" : "El branch main de"} <strong>{repo}</strong> {isLocked ? "ya permite merges y pushes." : "ha sido bloqueado temporalmente."}
								</p>
								{webhookUrl && (
									<p className="text-xs text-muted-foreground mt-2">
										Notificación enviada al canal de Discord
									</p>
								)}
							</div>
							<Dialog.Close asChild>
								<button className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
									Cerrar
								</button>
							</Dialog.Close>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
