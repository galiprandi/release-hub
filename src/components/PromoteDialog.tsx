import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Rocket, X, Loader2, CheckCircle2 } from "lucide-react"
import axios from "axios"
import { runCommand } from "@/api/exec"
import { useRepoPermission } from "../hooks/useRepoPermission"
import { useDiscordChannel } from "@/hooks/useDiscordChannel"
import { useGitUser } from "@/hooks/useGitUser"
import { DiscordNotification } from "@/components/ui/DiscordNotification"

interface PromoteDialogProps {
	repo: string
	latestTag?: string
	iconOnly?: boolean
}

type Step = 'config' | 'success'

export function PromoteDialog({ repo, latestTag, iconOnly = false }: PromoteDialogProps) {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<Step>('config')
	const [tagName, setTagName] = useState("")
	const [tagMessage, setTagMessage] = useState("")
	const [isCreating, setIsCreating] = useState(false)
	const [error, setError] = useState("")
	const { webhookUrl, saveWebhook } = useDiscordChannel(repo)
	const [tempWebhookUrl, setTempWebhookUrl] = useState(webhookUrl)
	const [notificationsEnabled, setNotificationsEnabled] = useState(!!webhookUrl)
	const { data: gitUser } = useGitUser()

	const { data: permissions, isLoading: isLoadingPerms } = useRepoPermission({ repo })
	const suggestedTag = latestTag ? incrementVersion(latestTag) : "v1.0.0"

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (newOpen) {
			setStep('config')
			// Recalculate suggested tag when opening dialog to get latest version
			const newSuggestedTag = latestTag ? incrementVersion(latestTag) : "v1.0.0"
			setTagName(newSuggestedTag)
			setTagMessage(`Release ${newSuggestedTag}`)
			setTempWebhookUrl(webhookUrl)
			setError("")
		}
	}


	const canCreateTags =
		permissions?.permissions?.push ||
		permissions?.permissions?.maintain ||
		permissions?.permissions?.admin ||
		permissions?.viewerPermission === 'WRITE' ||
		permissions?.viewerPermission === 'ADMIN' ||
		permissions?.viewerCanAdminister

	const handleCreateTag = async () => {
		if (!tagName.trim()) { setError("El nombre del Tag es requerido"); return }
		// Obtener el commit más reciente de main
		const latestCommitResult = await runCommand(`gh api repos/${repo}/commits/main --jq '.sha'`)
		const targetCommit = latestCommitResult.stdout.trim()
		if (!targetCommit) throw new Error("No se pudo obtener el commit más reciente de main")

		setIsCreating(true)
		setError("")
		try {
			const tokenResult = await runCommand('gh auth token')
			const token = tokenResult.stdout.trim()
			if (!token) throw new Error("Sin token de GitHub configurado en gh CLI")
			const tagResponse = await axios.post(
				`https://api.github.com/repos/${repo}/git/tags`,
				{ tag: tagName, message: tagMessage || `Release ${tagName}`, object: targetCommit, type: "commit" },
				{ headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
			)
			await axios.post(
				`https://api.github.com/repos/${repo}/git/refs`,
				{ ref: `refs/tags/${tagName}`, sha: tagResponse.data.sha },
				{ headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
			)

			// Save Discord webhook if provided
			if (tempWebhookUrl && tempWebhookUrl !== webhookUrl) {
				saveWebhook(tempWebhookUrl)
			}

			// Send Discord notification if enabled and webhook is configured
			if (notificationsEnabled && tempWebhookUrl) {
				await sendDiscordNotification(tempWebhookUrl, repo, tagName)
			}

			queryClient.invalidateQueries({ queryKey: ["git", "tags", repo] })
			queryClient.invalidateQueries({ queryKey: ["git", "tags-simple", repo] })
			queryClient.invalidateQueries({ queryKey: ["repo", "permission", repo] })
			setStep('success')
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al crear el Tag")
		} finally {
			setIsCreating(false)
		}
	}

	const sendDiscordNotification = async (webhookUrl: string, repo: string, tag: string) => {
		try {
			const timestamp = new Date().toISOString()
			const userName = gitUser?.name || "Unknown"

			const embed = {
				title: "🚀 Nueva Promoción a Producción",
				description: `El tag **${tag}** de \`${repo}\` ha sido publicado en producción ${userName} desde ReleaseHub.`,
				color: 16777215, // White for promotion
				timestamp,
				footer: {
					text: "ReleaseHub - Promoción",
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
								className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
							>
								<Rocket className="w-3 h-3" />
								{!iconOnly && <span>Promocionar</span>}
							</button>
						</Dialog.Trigger>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-3 py-2 rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
							sideOffset={5}
						>
							<div className="text-xs space-y-1">
								<div className="font-medium">Crear tag para promocionar a producción</div>
								<div className="text-muted-foreground">
									Crear un nuevo tag en el commit más reciente de main
								</div>
							</div>
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className={`fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full ${dialogWidth} max-h-[80vh] bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col transition-all duration-200`}>
					<Dialog.Description className="sr-only">
						Proceso de promoción a producción
					</Dialog.Description>

					{/* Header — same pattern as DiffDialog */}
					<div className="flex items-center justify-between mb-4 flex-shrink-0">
						<Dialog.Title className="text-lg font-semibold flex items-center gap-2">
							{step === 'config' && <><Rocket className="w-4 h-4" /> Configurar Lanzamiento</>}
							{step === 'success' && <><CheckCircle2 className="w-4 h-4 text-green-600" /> Lanzamiento Exitoso</>}
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

					{/* Step 1: Tag Config */}
					{step === 'config' && (
						<div className="flex flex-col flex-1 overflow-y-auto">
							<div className="space-y-4">
								{latestTag && (
									<div className="text-sm">
										<span className="text-muted-foreground">Último Tag: </span>
										<span className="font-mono font-medium">{latestTag}</span>
									</div>
								)}

								<div>
									<label htmlFor="promote-tag-name" className="block text-sm font-medium mb-2">
										Nombre del Tag
									</label>
									<input
										id="promote-tag-name"
										type="text"
										value={tagName}
										onChange={(e) => setTagName(e.target.value)}
										placeholder={suggestedTag}
										className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
									/>
								</div>

								<div>
									<label htmlFor="promote-tag-message" className="block text-sm font-medium mb-2">
										Descripción (opcional)
									</label>
									<textarea
										id="promote-tag-message"
										value={tagMessage}
										onChange={(e) => setTagMessage(e.target.value)}
										placeholder="Descripción del release..."
										rows={3}
										className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
									/>
								</div>

								<DiscordNotification
									webhookUrl={tempWebhookUrl}
									onWebhookChange={setTempWebhookUrl}
									enabled={notificationsEnabled}
									onEnabledChange={setNotificationsEnabled}
								/>

								{error && <p className="text-sm text-red-600">{error}</p>}

								{!canCreateTags && !isLoadingPerms && (
									<p className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100">
										No tienes permisos de escritura en este repositorio para crear tags.
									</p>
								)}
							</div>

							<div className="mt-4 pt-4 border-t flex justify-end flex-shrink-0">
								<button
									onClick={handleCreateTag}
									disabled={isCreating || !tagName.trim() || (!canCreateTags && !isLoadingPerms)}
									className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
								>
									{isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</> : <><Rocket className="w-4 h-4" /> Publicar Tag</>}
								</button>
							</div>
						</div>
					)}

					{/* Step 3: Success */}
					{step === 'success' && (
						<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
							<CheckCircle2 className="w-12 h-12 text-green-600" />
							<div>
								<p className="text-lg font-semibold">Tag <span className="font-mono">{tagName}</span> creado</p>
								<p className="text-sm text-muted-foreground mt-1">El lanzamiento fue publicado correctamente en <strong>{repo}</strong>.</p>
								{tempWebhookUrl && (
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

function incrementVersion(tag: string): string {
	const version = tag.replace(/^v/, "")
	const parts = version.split(".")
	if (parts.length < 2) return `v${version}.1.0`
	const major = parts[0]
	const minor = parts[1]
	const patch = parts[2] ? parseInt(parts[2], 10) + 1 : 0
	return `v${major}.${minor}.${patch}`
}
