import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { GitCompare, X, Loader2, GitBranch } from "lucide-react"
import { runCommand } from "@/api/exec"
import { CommitLink } from "./CommitLink"
import { DisplayInfo } from "./DislpayInfo"
import { RefetchButton } from "./ui/RefetchButton"
import { CreateTagDialog } from "./CreateTagDialog"
import { useRepoPermission } from "../hooks/useRepoPermission"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/es"

dayjs.extend(relativeTime)
dayjs.locale("es")

interface DiffDialogProps {
	repo: string
	currentTag: string
}

export function DiffDialog({ repo, currentTag }: DiffDialogProps) {
	const [open, setOpen] = useState(false)
	const [selectedShas, setSelectedShas] = useState<Set<string>>(new Set())
	const [org, product] = repo.split("/")

	const { data: permissions, isLoading: isLoadingPerms } = useRepoPermission({ repo })

	const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage, refetch, dataUpdatedAt } = useInfiniteQuery({
		queryKey: ["git", "diff", repo, currentTag],
		queryFn: async ({ pageParam = 0 }) => {
			const page = pageParam as number
			const perPage = 15
			const result = await runCommand(`gh api repos/${repo}/compare/${currentTag}...main`)
			const data = JSON.parse(result.stdout)
			const allCommits = data.commits || []
			// Paginación local: retornar solo los commits de la página actual
			return allCommits.slice(page * perPage, (page + 1) * perPage)
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			// Si la última página tiene menos de 15 commits o es undefined, no hay más páginas
			if (!lastPage || lastPage.length < 15) return undefined
			return allPages.length
		},
		enabled: open && !!currentTag,
	})

	const diffCommits = data?.pages.flat()

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
		if (selectedShas.size === (diffCommits?.length || 0)) {
			setSelectedShas(new Set())
		} else {
			setSelectedShas(new Set(diffCommits?.map(c => c.sha) || []))
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={(val) => {
			setOpen(val)
			if (!val) setSelectedShas(new Set())
		}}>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
				>
					<GitCompare className="w-3 h-3" />
					Diff
				</button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-4xl max-h-[80vh] bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col">
					<Dialog.Description className="sr-only">
						Ver los commits que están en main pero no en {currentTag}
					</Dialog.Description>
					<div className="flex items-center justify-between mb-4 flex-shrink-0">
						<Dialog.Title className="text-lg font-semibold flex items-center gap-2">
							Diferencia main <GitBranch className="w-4 h-4" /> {currentTag} ({diffCommits?.length || 0} Commits)
						</Dialog.Title>
						<div className="flex items-center gap-2">
							<RefetchButton
								onRefetch={() => refetch()}
								isRefetching={isLoading || isFetchingNextPage}
								showFeedback={true}
								targetTime={dataUpdatedAt}
							/>
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
					</div>

					{isLoading && (
						<div className="flex items-center justify-center py-8 flex-shrink-0">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Cargando información de Diff...
							</div>
						</div>
					)}

					{error && (
						<div className="text-sm text-red-600 flex-shrink-0">
							Error detectado durante la carga de Diff: {error instanceof Error ? error.message : "Error desconocido"}
						</div>
					)}
					{diffCommits && diffCommits.length > 0 ? (
						<div className="flex flex-col flex-1 overflow-hidden">
							<div className="overflow-hidden border rounded-lg flex-1 overflow-y-auto">
								<table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
									<thead className="bg-muted sticky top-0 z-10">
										<tr>
											<th className="px-3 py-2 text-left font-medium w-[40px]">
												<input
													type="checkbox"
													className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
													checked={selectedShas.size > 0 && selectedShas.size === (diffCommits?.length || 0)}
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
										{diffCommits.map((commit: { sha: string; commit: { message: string; author: { name: string; date: string } }; author?: { login: string } }) => (
											<tr key={commit.sha} className={`border-t hover:bg-muted/50 transition-colors ${selectedShas.has(commit.sha) ? 'bg-blue-50/30' : ''}`}>
												<td className="px-3 py-2 w-[40px]">
													<input
														type="checkbox"
														className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
														checked={selectedShas.has(commit.sha)}
														onChange={() => toggleCommit(commit.sha)}
													/>
												</td>
												<td className="px-3 py-2 w-[15%]">
													<CommitLink hash={commit.sha} org={org} repo={product} />
												</td>
												<td className="px-3 py-2 text-muted-foreground w-[15%]">
													{dayjs(commit.commit.author.date).fromNow()}
												</td>
												<td className="px-3 py-2 w-[20%]">
													<DisplayInfo value={commit.author?.login || commit.commit.author.name} type="author" maxChar={30} />
												</td>
												<td className="px-3 py-2 w-[45%]">
													<div className="truncate text-muted-foreground" title={commit.commit.message.split('\n')[0]}>
														{commit.commit.message.split('\n')[0]}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							
							<div className="mt-4 pt-4 border-t flex items-center justify-between flex-shrink-0">
								<div className="flex flex-col">
									<div className="text-sm font-medium">
										{selectedShas.size > 0 ? (
											<span className="text-orange-600">{selectedShas.size} commit(s) seleccionados para Hotfix</span>
										) : (
											<span className="text-blue-600">Lanzamiento Completo (Full Release)</span>
										)}
									</div>
									<div className="text-xs text-muted-foreground">
										{selectedShas.size > 0 
											? "Se creará un tag desde el commit seleccionado más reciente." 
											: `Se incluirán los ${diffCommits.length} commits pendientes.`
										}
									</div>
								</div>
								
								<div className="flex items-center gap-2">
									{hasNextPage && !isLoading && (
										<button
											type="button"
											onClick={() => fetchNextPage()}
											disabled={isFetchingNextPage}
											className="flex items-center gap-2 px-3 py-1.5 text-xs bg-background hover:bg-accent border rounded-md transition-colors disabled:opacity-50"
										>
											{isFetchingNextPage && <Loader2 className="w-3 h-3 animate-spin" />}
											Cargar más
										</button>
									)}
									
									<CreateTagDialog 
										repo={repo}
										product={product}
										latestTag={currentTag}
										commit={selectedShas.size > 0 ? Array.from(selectedShas)[0] : "main"}
										canCreateTags={
											permissions?.permissions?.push ||
											permissions?.permissions?.maintain ||
											permissions?.permissions?.admin ||
											permissions?.viewerPermission === 'WRITE' ||
											permissions?.viewerPermission === 'ADMIN' ||
											permissions?.viewerCanAdminister
										}
										isLoadingPermissions={isLoadingPerms}
										onSuccess={() => {
											setOpen(false)
											setSelectedShas(new Set())
										}}
									>
										<button
											type="button"
											className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-all shadow-sm ${
												selectedShas.size > 0 
												? 'bg-orange-600 hover:bg-orange-700 ring-orange-100 focus:ring-4' 
												: 'bg-red-600 hover:bg-red-700 ring-red-100 focus:ring-4'
											}`}
										>
											{selectedShas.size > 0 
												? `Crear Hotfix (${selectedShas.size})` 
												: "Promocionar todo a Producción"
											}
										</button>
									</CreateTagDialog>
								</div>
							</div>
						</div>
					) : (
						<div className="text-sm text-muted-foreground py-4 flex-shrink-0">
							Sin Commits en main pendientes de incluir en {currentTag}
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
