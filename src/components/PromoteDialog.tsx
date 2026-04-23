import { useState, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { Rocket, X, Loader2, GitBranch, GitMerge, AlertCircle, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react"
import axios from "axios"
import { runCommand } from "@/api/exec"
import { CommitLink } from "./CommitLink"
import { DisplayInfo } from "./DislpayInfo"
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

	// Sensor for infinite scroll
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

	// Infinite scroll implementation
	useEffect(() => {
		if (step !== 'list' || !hasNextPage || isFetchingNextPage || !open) return

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					fetchNextPage()
				}
			},
			{ threshold: 0.1 }
		)

		const currentRef = loadMoreRef.current
		if (currentRef) {
			observer.observe(currentRef)
		}

		return () => {
			if (currentRef) {
				observer.unobserve(currentRef)
			}
			observer.disconnect()
		}
	}, [step, hasNextPage, isFetchingNextPage, fetchNextPage, open])

	const toggleCommit = (sha: string) => {
		const newSelected = new Set(selectedShas)
		if (newSelected.has(sha)) {
			newSelected.delete(sha)
		} else {
			newSelected.add(sha)
		}
		setSelectedShas(newSelected)
	}

	const toggleAll = () => {
		if (selectedShas.size === commits.length) {
			setSelectedShas(new Set())
		} else {
			setSelectedShas(new Set(commits.map(c => c.hash)))
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
		if (!tagName.trim()) {
			setError("El nombre del Tag es requerido para proceder")
			return
		}

		const targetCommit = selectedShas.size > 0 
			? Array.from(selectedShas)[0]
			: (commits[0]?.hash || "main")

		setIsCreating(true)
		setError("")

		try {
			const tokenResult = await runCommand('gh auth token')
			const token = tokenResult.stdout.trim()
			if (!token) throw new Error("Sin token de GitHub configurado en gh CLI")

			// Step 1: Create tag object
			const tagResponse = await axios.post(
				`https://api.github.com/repos/${repo}/git/tags`,
				{
					tag: tagName,
					message: tagMessage || `Release ${tagName}`,
					object: targetCommit,
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
			queryClient.invalidateQueries({ queryKey: ["repo", "permission", repo] })
			
			setStep('success')
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error detectado durante la creación del Tag")
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-all shadow-sm hover:shadow active:scale-95 group"
				>
					<Rocket className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
					Promocionar
				</button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
				<Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-4xl max-h-[85vh] bg-background rounded-xl shadow-2xl border p-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col z-50">
					<Dialog.Description className="sr-only">
						Proceso de promoción a producción en pasos integrados
					</Dialog.Description>
					
					{/* Header */}
					<div className="p-6 border-b flex items-center justify-between bg-muted/30">
						<div className="flex items-center gap-4">
							<div className={`p-2 rounded-lg ${step === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
								{step === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <GitMerge className="w-6 h-6" />}
							</div>
							<div>
								<Dialog.Title className="text-xl font-bold">
									{step === 'list' && "Seleccionar Cambios"}
									{step === 'config' && "Configurar Lanzamiento"}
									{step === 'success' && "¡Lanzamiento Exitoso!"}
								</Dialog.Title>
								<p className="text-sm text-muted-foreground mt-0.5">
									{repo} • {step === 'list' ? 'Paso 1 de 2' : step === 'config' ? 'Paso 2 de 2' : 'Finalizado'}
								</p>
							</div>
						</div>
						
						<div className="flex items-center gap-3">
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
									className="p-2 rounded-full hover:bg-muted transition-colors outline-none"
								>
									<X className="w-5 h-5" />
									<span className="sr-only">Cerrar</span>
								</button>
							</Dialog.Close>
						</div>
					</div>

					{/* Content Body */}
					<div className="flex-1 overflow-hidden flex flex-col">
						{step === 'list' && (
							<div className="flex-1 flex flex-col overflow-hidden p-6">
								{isLoading && !commits.length ? (
									<div className="flex-1 flex flex-col items-center justify-center space-y-4">
										<Loader2 className="w-10 h-10 animate-spin text-red-600" />
										<p className="text-muted-foreground font-medium text-lg animate-pulse">Analizando commits...</p>
									</div>
								) : fetchError ? (
									<div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
										<AlertCircle className="w-12 h-12 text-red-600 mb-4" />
										<h3 className="text-lg font-semibold text-foreground">Error al cargar datos</h3>
										<p className="text-muted-foreground mt-2">{fetchError instanceof Error ? fetchError.message : "No se pudo obtener el historial."}</p>
									</div>
								) : commits.length === 0 ? (
									<div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl m-4">
										<GitBranch className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
										<h3 className="text-lg font-medium">Sin cambios pendientes</h3>
										<p className="text-muted-foreground mt-2">La rama main está al día con el último tag publicado.</p>
									</div>
								) : (
									<>
										<div className="flex-1 overflow-y-auto border rounded-xl bg-card custom-scrollbar">
											<table className="w-full text-sm relative" style={{ tableLayout: 'fixed' }}>
												<thead className="bg-muted/80 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
													<tr>
														<th className="px-4 py-3 text-left w-[50px]">
															<div className="flex items-center justify-center">
																<input
																	type="checkbox"
																	className="w-4 h-4 rounded border-gray-300 text-red-600 accent-red-600 cursor-pointer"
																	checked={commits.length > 0 && selectedShas.size === commits.length}
																	onChange={toggleAll}
																/>
															</div>
														</th>
														<th className="px-4 py-3 text-left w-[100px]">Hash</th>
														<th className="px-4 py-3 text-left w-[130px]">Fecha</th>
														<th className="px-4 py-3 text-left w-[150px]">Autor</th>
														<th className="px-4 py-3 text-left">Mensaje</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-border">
													{commits.map((commit) => (
														<tr 
															key={commit.hash} 
															className={`group hover:bg-muted/40 cursor-pointer transition-colors ${selectedShas.has(commit.hash) ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}
															onClick={() => toggleCommit(commit.hash)}
														>
															<td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
																<div className="flex items-center justify-center">
																	<input
																		type="checkbox"
																		className="w-4 h-4 rounded border-gray-300 text-red-600 accent-red-600 cursor-pointer"
																		checked={selectedShas.has(commit.hash)}
																		onChange={() => toggleCommit(commit.hash)}
																	/>
																</div>
															</td>
															<td className="px-4 py-3 font-mono text-xs">
																<CommitLink hash={commit.hash} org={org} repo={product} />
															</td>
															<td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
																{dayjs(commit.date).fromNow()}
															</td>
															<td className="px-4 py-3">
																<DisplayInfo value={commit.author} type="author" maxChar={25} />
															</td>
															<td className="px-4 py-3">
																<div className="truncate font-medium text-foreground" title={commit.message}>
																	{commit.message.split('\n')[0]}
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
											
											{/* Infinite Scroll Sensor */}
											<div ref={loadMoreRef} className="p-6 flex items-center justify-center border-t bg-muted/5">
												{isFetchingNextPage ? (
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														<Loader2 className="w-4 h-4 animate-spin" />
														Cargando más commits...
													</div>
												) : hasNextPage ? (
													<span className="text-xs text-muted-foreground animate-pulse">Desliza para cargar más</span>
												) : (
													<span className="text-xs text-muted-foreground font-medium">Fin del historial disponible</span>
												)}
											</div>
										</div>

										{/* Action Bar */}
										<div className="mt-6 flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
											<div className="flex items-center gap-3">
												<div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${selectedShas.size > 0 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
													<Rocket className="w-5 h-5" />
												</div>
												<div>
													<p className="text-sm font-bold uppercase tracking-wider">
														{selectedShas.size > 0 ? 'Hotfix Release' : 'Full Promotion'}
													</p>
													<p className="text-xs text-muted-foreground font-medium">
														{selectedShas.size > 0 ? `${selectedShas.size} cambios seleccionados manualmente` : `Se incluirán los ${commits.length} commits acumulados`}
													</p>
												</div>
											</div>
											<button
												onClick={() => setStep('config')}
												className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-95"
											>
												Configurar Lanzamiento
												<ChevronRight className="w-4 h-4" />
											</button>
										</div>
									</>
								)}
							</div>
						)}

						{step === 'config' && (
							<div className="flex-1 flex flex-col p-10 max-w-2xl mx-auto w-full space-y-8 animate-in slide-in-from-right-4 duration-300">
								<div className="space-y-2">
									<h3 className="text-lg font-bold">Detalles de la Versión</h3>
									<p className="text-sm text-muted-foreground">Define el tag y el mensaje que quedarán registrados en GitHub.</p>
								</div>

								<div className="space-y-6">
									<div className="space-y-2">
										<label className="text-sm font-bold flex items-center justify-between">
											Nombre del Tag (SemVer)
											{latestTag && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-mono text-muted-foreground">Anterior: {latestTag}</span>}
										</label>
										<input
											type="text"
											value={tagName}
											onChange={(e) => setTagName(e.target.value)}
											placeholder="Ej: v1.5.0"
											className="w-full px-4 py-3 bg-card border rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-mono shadow-sm"
										/>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-bold">Mensaje / Notas del Release</label>
										<textarea
											value={tagMessage}
											onChange={(e) => setTagMessage(e.target.value)}
											placeholder="Ej: Solución de bug crítico en el login..."
											rows={4}
											className="w-full px-4 py-3 bg-card border rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none shadow-sm"
										/>
									</div>

									{error && (
										<div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3 text-sm animate-in fade-in zoom-in-95">
											<AlertCircle className="w-5 h-5 flex-shrink-0" />
											{error}
										</div>
									)}

									{!canCreateTags && !isLoadingPerms && (
										<div className="p-4 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 text-xs flex gap-3">
											<AlertCircle className="w-4 h-4 flex-shrink-0" />
											<div>
												<p className="font-bold">Acceso Denegado</p>
												<p>No tienes permisos de escritura en este repositorio. Contacta al administrador para habilitar lanzamientos.</p>
											</div>
										</div>
									)}

									<div className="pt-4 flex items-center gap-4">
										<button
											onClick={() => setStep('list')}
											className="flex-1 px-6 py-3 font-bold border rounded-xl hover:bg-muted transition-all inline-flex items-center justify-center gap-2"
										>
											<ChevronLeft className="w-4 h-4" />
											Volver
										</button>
										<button
											onClick={handleCreateTag}
											disabled={isCreating || !tagName.trim() || (!canCreateTags && !isLoadingPerms)}
											className="flex-[2] px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2"
										>
											{isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
											{isCreating ? 'Publicando...' : 'Publicar Release'}
										</button>
									</div>
								</div>
							</div>
						)}

						{step === 'success' && (
							<div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
								<div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-bounce shadow-inner">
									<CheckCircle2 className="w-12 h-12" />
								</div>
								<div className="space-y-2">
									<h2 className="text-4xl font-bold tracking-tight">¡Lanzamiento Exitoso!</h2>
									<p className="text-muted-foreground text-lg max-w-md mx-auto">La versión <strong>{tagName}</strong> ha sido publicada correctamente en <strong>{repo}</strong>.</p>
								</div>
								<div className="pt-8">
									<Dialog.Close asChild>
										<button className="px-10 py-3.5 bg-primary text-white font-bold rounded-xl hover:shadow-2xl transition-all active:scale-95 shadow-xl">
											Finalizar y Volver
										</button>
									</Dialog.Close>
								</div>
							</div>
						)}
					</div>
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
