import { useState, useMemo, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Rocket, Loader2, CheckCircle2, ChevronRight, ChevronLeft, GitCommit, Sparkles } from "lucide-react"
import axios from "axios"
import { runCommand } from "@/api/exec"
import { useRepoPermission } from "@/hooks/useRepoPermission"
import { useDiscordChannel } from "@/hooks/useDiscordChannel"
import { useGitUser } from "@/hooks/useGitUser"
import { useGitCommits } from "@/hooks/useGitCommits"
import { useGitTags } from "@/hooks/useGitTags"
import { useCommitSummary } from "@/hooks/useCommitSummary"
import { DiscordNotification } from "@/components/ui/DiscordNotification"
import { CommitLink } from "@/github/components/CommitLink"
import { BaseDialog } from "@/components/ui/BaseDialog"
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"

interface PromoteDialogProps {
	repo: string
	latestTag?: string
	iconOnly?: boolean
	showLabel?: boolean
}

type Step = 'config' | 'success'

export function PromoteDialog({ repo, latestTag, iconOnly = false, showLabel = false }: PromoteDialogProps) {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<Step>('config')
	const [tagName, setTagName] = useState("")
	const [tagMessage, setTagMessage] = useState("")
	const [isCreating, setIsCreating] = useState(false)
	const [error, setError] = useState("")
	const [showCommits, setShowCommits] = useState(false)
	const { webhookUrl } = useDiscordChannel(repo)
	const [notificationsEnabled, setNotificationsEnabled] = useState(!!webhookUrl)
	const { data: gitUser } = useGitUser()

	const { data: permissions, isLoading: isLoadingPerms } = useRepoPermission({ repo })
	const suggestedTag = latestTag ? incrementVersion(latestTag) : "v1.0.0"

	// Fetch commits and tags to show pending commits
	const [org, name] = repo.split("/")
	const { commits } = useGitCommits({ repo, enabled: open })
	const { latestTag: latestTagData } = useGitTags({ repo, enabled: open })

	// Calculate pending commits (commits after the production tag)
	const pendingCommits = useMemo(() => {
		if (!commits || !latestTagData?.commit) return []
		const prodCommitIndex = commits.findIndex(c => c.hash === latestTagData.commit)
		if (prodCommitIndex === -1) return commits // If can't find prod commit, show all
		return commits.slice(0, prodCommitIndex) // Commits before the prod commit in the list (more recent)
	}, [commits, latestTagData])

	const hasPendingCommits = pendingCommits.length > 0

	// Hook para generar resumen de commits con IA
	const { generateCommitSummary, isGenerating: isGeneratingSummary, summary, isAvailable: summaryAvailable, getStatusMessage } = useCommitSummary()

	// Generar automáticamente el resumen cuando se abre el diálogo y hay commits pendientes
	useEffect(() => {
		const autoGenerateSummary = async () => {
			if (open && hasPendingCommits && summaryAvailable && !tagMessage) {
				await generateCommitSummary(pendingCommits)
			}
		}
		autoGenerateSummary()
	}, [open, hasPendingCommits, summaryAvailable, pendingCommits, tagMessage, generateCommitSummary])

	// Usar summary cuando existe, sino tagMessage
	const displayMessage = summary || tagMessage

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (newOpen) {
			setStep('config')
			// Recalculate suggested tag when opening dialog to get latest version
			const newSuggestedTag = latestTag ? incrementVersion(latestTag) : "v1.0.0"
			setTagName(newSuggestedTag)
			// No sobrescribir tagMessage si IA ya generó uno
			if (!tagMessage) {
				setTagMessage(`Release ${newSuggestedTag}`)
			}
			setNotificationsEnabled(!!webhookUrl)
			setError("")
		} else {
			// Limpiar tagMessage al cerrar para regenerar en la próxima apertura
			setTagMessage("")
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
		const latestCommitResult = await runCommand(['gh', 'api', `repos/${repo}/commits/main`, '--jq', '.sha'])
		const targetCommit = latestCommitResult.stdout.trim()
		if (!targetCommit) throw new Error("No se pudo obtener el commit más reciente de main")

		setIsCreating(true)
		setError("")
		try {
			const tokenResult = await runCommand(['gh', 'auth', 'token'])
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

			// Send Discord notification if enabled and webhook is configured
			if (notificationsEnabled && webhookUrl) {
				await sendDiscordNotification(webhookUrl, repo, tagName)
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

	const dialogWidth = step === 'success' ? 'max-w-md' : (hasPendingCommits && showCommits ? 'max-w-5xl' : 'max-w-xl')

	return (
		<>
			{iconOnly ? (
				<ActionButton
					action={ACTION_DEFINITIONS.promoteToProd}
					onClick={() => handleOpenChange(true)}
					showLabel={showLabel}
				/>
			) : (
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<button
								type="button"
								onClick={() => handleOpenChange(true)}
								aria-haspopup="dialog"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold uppercase tracking-wider bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none shadow-sm"
							>
								<Rocket className="w-4 h-4" />
								<span>Promocionar</span>
							</button>
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
			)}
			<BaseDialog
				open={open}
				onOpenChange={handleOpenChange}
				title={
					<>
						{step === 'config' && <><Rocket className="w-4 h-4" /> Configurar Lanzamiento</>}
						{step === 'success' && <><CheckCircle2 className="w-4 h-4 text-success" /> Lanzamiento Exitoso</>}
					</>
				}
				description="Proceso de promoción a producción"
				maxWidth={dialogWidth}
			>
				{/* Step 1: Tag Config */}
					{step === 'config' && (
						<div className={`flex flex-1 overflow-hidden ${showCommits ? 'flex-row gap-6' : 'flex-col overflow-y-auto'}`}>
							{/* Left column: Form */}
							<div className={`space-y-4 ${showCommits ? 'w-1/2 flex flex-col' : ''}`}>
								<div className={`space-y-4 ${showCommits ? 'flex-1 overflow-y-auto pr-2' : ''}`}>
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
											className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all"
										/>
									</div>

									<div>
										<div className="flex items-center justify-between mb-2">
											<label htmlFor="promote-tag-message" className="block text-sm font-medium">
												Descripción (opcional)
											</label>
											<button
												type="button"
												onClick={() => generateCommitSummary(pendingCommits)}
												disabled={isGeneratingSummary || !summaryAvailable || !hasPendingCommits}
												className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ai hover:bg-ai/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
												title="Regenerar descripción con IA"
											>
												{isGeneratingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
												{isGeneratingSummary ? getStatusMessage : "Regenerar"}
											</button>
										</div>
										<textarea
											id="promote-tag-message"
											value={displayMessage}
											onChange={(e) => setTagMessage(e.target.value)}
											placeholder="Descripción del release..."
											rows={8}
											disabled={isGeneratingSummary}
											className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all resize-y disabled:opacity-50"
										/>
									</div>

									<DiscordNotification
										webhookUrl={webhookUrl}
										enabled={notificationsEnabled}
										onEnabledChange={setNotificationsEnabled}
										readonly
									/>

									{pendingCommits.length > 0 && (
										<button
											type="button"
											onClick={() => setShowCommits(!showCommits)}
											aria-expanded={showCommits}
											aria-controls="pending-commits-list"
											className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted border rounded-md transition-all text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
										>
											<span className="flex items-center gap-2">
												<GitCommit className="w-4 h-4 text-muted-foreground" />
												<span className="font-medium">{pendingCommits.length} commit{pendingCommits.length !== 1 ? 's' : ''} a promocionar</span>
											</span>
											{showCommits ? (
												<ChevronLeft className="w-4 h-4 text-muted-foreground" />
											) : (
												<ChevronRight className="w-4 h-4 text-muted-foreground" />
											)}
										</button>
									)}

									{error && <p className="text-sm text-destructive">{error}</p>}

									{!canCreateTags && !isLoadingPerms && (
										<p className="text-[10px] text-warning bg-warning/10 p-2 rounded-lg border border-warning/20">
											No tienes permisos de escritura en este repositorio para crear tags.
										</p>
									)}
								</div>

								<div className="mt-4 pt-4 border-t border-border/60 flex justify-end flex-shrink-0">
									<button
										onClick={handleCreateTag}
										disabled={isCreating || !tagName.trim() || (!canCreateTags && !isLoadingPerms)}
										className="px-4 py-2 text-sm font-bold uppercase tracking-wider bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none shadow-sm"
									>
										{isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</> : <><Rocket className="w-4 h-4" /> Publicar Tag</>}
									</button>
								</div>
							</div>

							{/* Right column: Commits list (only when expanded) */}
							{showCommits && pendingCommits.length > 0 && (
								<div id="pending-commits-list" className="w-1/2 flex flex-col border-l pl-6">
									<div className="mb-3">
										<div className="flex items-center gap-2">
											<GitCommit className="w-4 h-4 text-muted-foreground" />
											<span className="font-medium text-sm">Cambios desde {latestTag}</span>
											<span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{pendingCommits.length}</span>
										</div>
										<p className="text-[10px] text-muted-foreground mt-1 pl-6">
											Commits que se incluirán en este release
										</p>
									</div>
									<div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[50vh]">
										{pendingCommits.map((commit) => (
											<div
												key={commit.hash}
												className="py-1 border-b border-border/50 last:border-0"
											>
												<div className="flex items-center gap-2">
													<CommitLink hash={commit.hash} org={org} repo={name} showStatus={false} />
													<span className="text-sm truncate flex-1" title={commit.message}>
														{commit.message.split('\n')[0]}
													</span>
												</div>
												<div className="text-[10px] text-muted-foreground mt-0.5 pl-6">
													{new Date(commit.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
													<span className="mx-1">•</span>
													{commit.author}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{/* Step 3: Success */}
					{step === 'success' && (
						<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
							<CheckCircle2 className="w-12 h-12 text-success" />
							<div>
								<p className="text-lg font-semibold">Tag <span className="font-mono">{tagName}</span> creado</p>
								<p className="text-sm text-muted-foreground mt-1">El lanzamiento fue publicado correctamente en <strong>{repo}</strong>.</p>
								{webhookUrl && (
									<p className="text-[10px] text-muted-foreground mt-2">
										Notificación enviada al canal de Discord
									</p>
								)}
							</div>
							<button
								type="button"
								onClick={() => handleOpenChange(false)}
								className="mt-4 px-4 py-2 text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm"
							>
								Cerrar
							</button>
						</div>
					)}
			</BaseDialog>
		</>
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
