import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Unlock, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { runCommand } from "@/api/exec"
import { useBranchProtection } from "@/hooks/useBranchProtection"
import { useDiscordChannel } from "@/hooks/useDiscordChannel"
import { useGitUser } from "@/hooks/useGitUser"
import { DiscordNotification } from "@/components/ui/DiscordNotification"
import { BaseDialog } from "@/components/ui/BaseDialog"
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"

interface FreezeDialogProps {
	repo: string
	iconOnly?: boolean
	showLabel?: boolean
}

type Step = 'config' | 'success'

export function FreezeDialog({ repo, iconOnly = false, showLabel = false }: FreezeDialogProps) {
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
		setError('')
		try {
			const tokenResult = await runCommand(['gh', 'auth', 'token'])
			const token = tokenResult.stdout.trim()
			if (!token) throw new Error('Sin token de GitHub configurado en gh CLI')

			// Build protection config
			const protectionConfig = {
				lock_branch: !isLocked,
				enforce_admins: false,
				required_pull_request_reviews: null,
				required_status_checks: null,
				restrictions: null,
			}

			// We can't easily use the array format for commands with Heredocs and complex redirection
			// but we can pass the JSON via a temporary file or use a safer approach.
			// However, runCommand with string still exists but is discouraged.
			// Let's use gh api with --input and pass the JSON as a string argument if possible,
			// or better, use the array format with -f for fields if it was simple,
			// but this is a complex nested object.
			// Let's use the string format but at least ensure repo is quoted if it wasn't already.
			// Wait, joinArgs/quote are for array elements.
			// Actually, we can use the array format and pass the body via stdin if runCommand supported it,
			// but it doesn't.
			// Let's try to use -f flags for the gh api command which is safer than heredoc.
			// But lock_branch is a boolean in a nested object.
			// Alternative: gh api repos/:owner/:repo/branches/:branch/protection -X PUT -f lock_branch=true ...
			// But the API expects a specific structure.

			const result = await runCommand([
				'gh',
				'api',
				`repos/${repo}/branches/main/protection`,
				'--method',
				'PUT',
				'--input',
				'-',
			], JSON.stringify(protectionConfig))

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
			{iconOnly ? (
				<ActionButton
					action={isLocked ? ACTION_DEFINITIONS.unfreezeBranch : ACTION_DEFINITIONS.freezeBranch}
					onClick={() => setOpen(true)}
					disabled={!canManage}
					showLabel={showLabel}
				/>
			) : (
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<Dialog.Trigger asChild>
								<button
									type="button"
									disabled={!canManage}
									className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
										isLocked
											? "bg-orange-600 text-white hover:bg-orange-700"
											: "bg-slate-500 text-white hover:bg-slate-600"
									} disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none`}
								>
									{isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
									<span>{isLocked ? "Desbloquear" : "Bloquear"}</span>
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
			)}
			<BaseDialog
				open={open}
				onOpenChange={handleOpenChange}
				title={step === 'config' ? <>{isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />} {isLocked ? "Desbloquear Branch" : "Bloquear Branch"}</> : <><CheckCircle2 className="w-4 h-4 text-green-600" /> {isLocked ? "Branch Desbloqueado" : "Branch Bloqueado"}</>}
				description="Gestión de bloqueo"
				maxWidth={dialogWidth}
			>
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
								className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ${
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
			</BaseDialog>
		</Dialog.Root>
	)
}
