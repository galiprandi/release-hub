import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { Plus, X, Loader2 } from "lucide-react"
import axios from "axios"
import { runCommand } from "@/api/exec"

interface CreateTagDialogProps {
	latestTag?: string
	repo: string
	product: string
	commit?: string
	canCreateTags?: boolean
	isLoadingPermissions?: boolean
	onSuccess?: () => void
}

export function CreateTagDialog({ latestTag, repo, product, commit, canCreateTags = true, isLoadingPermissions = false, onSuccess }: CreateTagDialogProps) {
	const [open, setOpen] = useState(false)
	const [tagName, setTagName] = useState("")
	const [tagMessage, setTagMessage] = useState("")
	const [isCreating, setIsCreating] = useState(false)
	const [error, setError] = useState("")
	const queryClient = useQueryClient()

	// Suggest next tag based on latest tag
	const suggestedTag = latestTag ? incrementVersion(latestTag) : "v1.0.0"

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (newOpen) {
			setTagName(suggestedTag)
			setTagMessage(`Release ${suggestedTag}`)
			setError("")
		}
	}

	const handleCreateTag = async () => {
		if (!tagName.trim()) {
			setError("El nombre del tag es requerido")
			return
		}

		if (!commit) {
			setError("No hay commit disponible para crear el tag")
			return
		}

		if (!canCreateTags) {
			setError("No tienes permisos para crear tags en este repositorio")
			return
		}

		setIsCreating(true)
		setError("")

		try {
			// Get GitHub token from gh CLI
			const tokenResult = await runCommand('gh auth token')
			const token = tokenResult.stdout.trim()
			if (!token) {
				throw new Error("No hay token de GitHub configurado en gh CLI")
			}

			// Step 1: Create tag object
			const tagResponse = await axios.post(
				`https://api.github.com/repos/${repo}/git/tags`,
				{
					tag: tagName,
					message: tagMessage || `Release ${tagName}`,
					object: commit,
					type: "commit",
				},
				{
					headers: {
						Authorization: `token ${token}`,
						Accept: "application/vnd.github.v3+json",
					},
				}
			)

			const tagSha = tagResponse.data.sha

			// Step 2: Create reference
			await axios.post(
				`https://api.github.com/repos/${repo}/git/refs`,
				{
					ref: `refs/tags/${tagName}`,
					sha: tagSha,
				},
				{
					headers: {
						Authorization: `token ${token}`,
						Accept: "application/vnd.github.v3+json",
					},
				}
			)

			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: ["git", "tags", repo] })
			queryClient.invalidateQueries({ queryKey: ["pipeline", product] })

			setOpen(false)
			onSuccess?.()
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al crear el tag")
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			{canCreateTags === true && !isLoadingPermissions ? (
				<Dialog.Trigger asChild>
					<button
						type="button"
						className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						<Plus className="w-3 h-3" />
						Tag
					</button>
				</Dialog.Trigger>
			) : (
				<button
					type="button"
					disabled
					className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-md opacity-50 cursor-not-allowed"
					title={isLoadingPermissions ? "Verificando permisos..." : canCreateTags === false ? "No tienes permisos para crear tags en este repositorio" : "Verificando permisos..."}
				>
					<Plus className="w-3 h-3" />
					Tag
				</button>
			)}
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
					<div className="flex items-center justify-between mb-4">
						<Dialog.Title className="text-lg font-semibold">Crear Nuevo Tag</Dialog.Title>
						<Dialog.Close asChild>
							<button
								type="button"
								className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
							>
								<X className="w-4 h-4" />
								<span className="sr-only">Cerrar</span>
							</button>
						</Dialog.Close>
					</div>

					<div className="space-y-4">
						{latestTag && (
							<div className="text-sm">
								<span className="text-muted-foreground">Último tag: </span>
								<span className="font-mono font-medium">{latestTag}</span>
							</div>
						)}

						<div>
							<label htmlFor="tag-name" className="block text-sm font-medium mb-2">
								Nombre del Tag
							</label>
							<input
								id="tag-name"
								type="text"
								value={tagName}
								onChange={(e) => setTagName(e.target.value)}
								placeholder={suggestedTag}
								className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
							/>
						</div>

						<div>
							<label htmlFor="tag-message" className="block text-sm font-medium mb-2">
								Descripción (opcional)
							</label>
							<textarea
								id="tag-message"
								value={tagMessage}
								onChange={(e) => setTagMessage(e.target.value)}
								placeholder="Ingresar una descripción..."
								rows={3}
								className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
							/>
						</div>

						{error && (
							<p className="text-sm text-red-600">{error}</p>
						)}

						<div className="flex justify-end gap-2">
							<Dialog.Close asChild>
								<button
									type="button"
									className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
								>
									Cancelar
								</button>
							</Dialog.Close>
							<button
								type="button"
								onClick={handleCreateTag}
								disabled={isCreating || !tagName.trim() || !canCreateTags}
								className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
								title={!canCreateTags ? "No tienes permisos para crear tags en este repositorio" : undefined}
							>
								{isCreating ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Creando...
									</>
								) : (
									"Publicar Tag"
								)}
							</button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

// Helper function to increment semantic version
function incrementVersion(tag: string): string {
	// Remove 'v' prefix if present
	const version = tag.replace(/^v/, "")
	
	// Split by dots
	const parts = version.split(".")
	if (parts.length < 2) return `v${version}.1.0`
	
	// Increment patch version
	const major = parts[0]
	const minor = parts[1]
	const patch = parts[2] ? parseInt(parts[2], 10) + 1 : 0
	
	return `v${major}.${minor}.${patch}`
}
