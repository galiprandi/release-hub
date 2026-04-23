import { useState, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { Rocket, X, Loader2, GitBranch, GitCompare, AlertCircle, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react"
import axios from "axios"
import { runCommand } from "@/api/exec"
import { CommitLink } from "./CommitLink"
import { DisplayInfo } from "./DisplayInfo"
import { RefetchButton } from "./ui/RefetchButton"
import { useRepoPermission } from "../hooks/useRepoPermission"
import { usePromoteCommits } from "../hooks/usePromoteCommits"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/es"

dayjs.extend(relativeTime)
dayjs.locale("es")

interface PromoteDialogProps {
	repo: string
	latestTag?: string
}

type Step = 'list' | 'config' | 'success'

export function PromoteDialog({ repo, latestTag }: PromoteDialogProps) {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<Step>('list')
	const [selectedShas, setSelectedShas] = useState<Set<string>>(new Set())
	const [tagName, setTagName] = useState("")
	const [tagMessage, setTagMessage] = useState("")
	const [isCreating, setIsCreating] = useState(false)
	const [error, setError] = useState("")
	const [org, product] = repo.split("/")
	const loadMoreRef = useRef<HTMLDivElement>(null)

	const { data: permissions, isLoading: isLoadingPerms } = useRepoPermission({ repo })

	const { 
		data, 
		isLoading, 
		error: fetchError, 
		hasNextPage, 
		fetchNextPage, 
		isFetchingNextPage, 
		refetch, 
		dataUpdatedAt 
	} = usePromoteCommits({ repo, latestTag, enabled: open })

	const commits = data?.pages.flat() || []
	const suggestedTag = latestTag ? incrementVersion(latestTag) : "v1.0.0"

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (newOpen) {
			setStep('list')
			setSelectedShas(new Set())
			setTagName(suggestedTag)
			setTagMessage(`Release ${suggestedTag}`)
			setError("")
		}
	}

	// Infinite scroll
	useEffect(() => {
		if (step !== 'list' || !hasNextPage || isFetchingNextPage || !open) return
		const observer = new IntersectionObserver(
			(entries) => { if (entries[0].isIntersecting) fetchNextPage() },
			{ threshold: 0.1 }
		)
		const currentRef = loadMoreRef.current
		if (currentRef) observer.observe(currentRef)
		return () => { if (currentRef) observer.unobserve(currentRef); observer.disconnect() }
	}, [step, hasNextPage, isFetchingNextPage, fetchNextPage, open])

	const toggleCommit = (hash: string) => {
		const newSelected = new Set(selectedShas)
		if (newSelected.has(hash)) newSelected.delete(hash)
		else newSelected.add(hash)
		setSelectedShas(newSelected)
	}

	const toggleAll = () => {
		if (selectedShas.size === commits.length) setSelectedShas(new Set())
		else setSelectedShas(new Set(commits.map(c => c.hash)))
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
		const targetCommit = selectedShas.size > 0 ? Array.from(selectedShas)[0] : (commits[0]?.hash || "main")
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
			queryClient.invalidateQueries({ queryKey: ["git", "tags", repo] })
			queryClient.invalidateQueries({ queryKey: ["repo", "permission", repo] })
			setStep('success')
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al crear el Tag")
		} finally {
			setIsCreating(false)
		}
	}

	const dialogWidth = step === 'success'
		? 'max-w-sm'
		: step === 'config'
			? 'max-w-lg'
			: 'max-w-3xl'

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
				>
					<Rocket className="w-3 h-3" />
					Promocionar
				</button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className={`fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full ${dialogWidth} max-h-[80vh] bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col transition-all duration-200`}>
					<Dialog.Description className="sr-only">
						Proceso de promoción a producción
					</Dialog.Description>

					{/* Header — same pattern as DiffDialog */}
					<div className="flex items-center justify-between mb-4 flex-shrink-0">
						<Dialog.Title className="text-lg font-semibold flex items-center gap-2">
							{step === 'list' && (
								<>
									<GitCompare className="w-4 h-4" />
									{latestTag ? `Promocionar: main → ${latestTag}` : `Primer lanzamiento: ${repo}`}
									{commits.length > 0 && <span className="text-muted-foreground font-normal">({commits.length} commits)</span>}
								</>
							)}
							{step === 'config' && <><Rocket className="w-4 h-4" /> Configurar Lanzamiento</>}
							{step === 'success' && <><CheckCircle2 className="w-4 h-4 text-green-600" /> Lanzamiento Exitoso</>}
						</Dialog.Title>
						<div className="flex items-center gap-2">
							{step === 'list' && (
								<RefetchButton
									onRefetch={() => refetch()}
									isRefetching={isLoading || isFetchingNextPage}
									showFeedback={true}
									targetTime={dataUpdatedAt}
								/>
							)}
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

					{/* Step 1: Commit List */}
					{step === 'list' && (
						<>
							{isLoading && !commits.length && (
								<div className="flex items-center justify-center py-8 flex-shrink-0">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="w-4 h-4 animate-spin" />
										Analizando commits...
									</div>
								</div>
							)}

							{fetchError && (
								<div className="text-sm text-red-600 flex-shrink-0">
									Error al cargar: {fetchError instanceof Error ? fetchError.message : "Error desconocido"}
								</div>
							)}

							{!isLoading && commits.length === 0 && !fetchError && (
								<div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
									<GitBranch className="w-8 h-8 mb-2 opacity-30" />
									<p className="text-sm">No hay commits pendientes de promoción.</p>
								</div>
							)}

							{commits.length > 0 && (
								<div className="flex flex-col flex-1 overflow-hidden">
									<div className="overflow-hidden border rounded-lg flex-1 overflow-y-auto">
										<table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
											<thead className="bg-muted sticky top-0 z-10">
												<tr>
													<th className="px-3 py-2 text-left font-medium w-[40px]">
														<input
															type="checkbox"
															className="rounded border-gray-300 text-red-600 focus:ring-red-500"
															checked={commits.length > 0 && selectedShas.size === commits.length}
															onChange={toggleAll}
														/>
													</th>
													<th className="px-3 py-2 text-left font-medium w-[15%]">Hash</th>
													<th className="px-3 py-2 text-left font-medium w-[15%]">Fecha</th>
													<th className="px-3 py-2 text-left font-medium w-[20%]">Autor</th>
													<th className="px-3 py-2 text-left font-medium w-[45%]">Mensaje</th>
												</tr>
											</thead>
											<tbody>
												{commits.map((commit) => (
													<tr
														key={commit.hash}
														className={`border-t hover:bg-muted/50 transition-colors cursor-pointer ${selectedShas.has(commit.hash) ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
														onClick={() => toggleCommit(commit.hash)}
													>
														<td className="px-3 py-2 w-[40px]" onClick={(e) => e.stopPropagation()}>
															<input
																type="checkbox"
																className="rounded border-gray-300 text-red-600 focus:ring-red-500"
																checked={selectedShas.has(commit.hash)}
																onChange={() => toggleCommit(commit.hash)}
															/>
														</td>
														<td className="px-3 py-2 w-[15%]">
															<CommitLink hash={commit.hash} org={org} repo={product} />
														</td>
														<td className="px-3 py-2 text-muted-foreground w-[15%]">
															{dayjs(commit.date).fromNow()}
														</td>
														<td className="px-3 py-2 w-[20%]">
															<DisplayInfo value={commit.author} type="author" maxChar={30} />
														</td>
														<td className="px-3 py-2 w-[45%]">
															<div className="truncate text-muted-foreground" title={commit.message.split('\n')[0]}>
																{commit.message.split('\n')[0]}
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
										{/* Infinite scroll sensor */}
										<div ref={loadMoreRef} className="flex items-center justify-center py-3 border-t text-xs text-muted-foreground">
											{isFetchingNextPage ? (
												<><Loader2 className="w-3 h-3 animate-spin mr-1" /> Cargando más commits...</>
											) : hasNextPage ? "Desliza para cargar más" : "Fin del historial"}
										</div>
									</div>

									<div className="mt-4 pt-4 border-t flex items-center justify-between flex-shrink-0">
										<div className="flex flex-col">
											<div className="text-sm font-medium">
												{selectedShas.size > 0 ? (
													<span className="text-orange-600">Hotfix: {selectedShas.size} commit{selectedShas.size > 1 ? 's' : ''} seleccionado{selectedShas.size > 1 ? 's' : ''}</span>
												) : (
													<span className="text-red-600">Full Promotion: {commits.length} commits</span>
												)}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												{selectedShas.size > 0 ? "Se creará el tag en el commit seleccionado más reciente" : "Se creará el tag en el commit más reciente"}
											</div>
										</div>
										<button
											onClick={() => setStep('config')}
											className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
										>
											Configurar Tag
											<ChevronRight className="w-4 h-4" />
										</button>
									</div>
								</div>
							)}
						</>
					)}

					{/* Step 2: Tag Config */}
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

								{error && <p className="text-sm text-red-600">{error}</p>}

								{!canCreateTags && !isLoadingPerms && (
									<p className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100">
										No tienes permisos de escritura en este repositorio para crear tags.
									</p>
								)}
							</div>

							<div className="mt-4 pt-4 border-t flex justify-between gap-2 flex-shrink-0">
								<button
									onClick={() => setStep('list')}
									className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors inline-flex items-center gap-1"
								>
									<ChevronLeft className="w-4 h-4" />
									Volver
								</button>
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
