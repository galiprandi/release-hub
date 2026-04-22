import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { GitCompare, X, Loader2, GitCommit } from "lucide-react"
import { runCommand } from "@/api/exec"

interface DiffDialogProps {
	repo: string
	currentTag: string
}

export function DiffDialog({ repo, currentTag }: DiffDialogProps) {
	const [open, setOpen] = useState(false)

	const { data: diffCommits, isLoading, error } = useQuery({
		queryKey: ["git", "diff", repo, currentTag],
		queryFn: async () => {
			const result = await runCommand(`gh api repos/${repo}/compare/main...${currentTag}`)
			const data = JSON.parse(result.stdout)
			return data.commits || []
		},
		enabled: open && !!currentTag,
	})

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
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
				<Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl max-h-[80vh] bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col">
					<div className="flex items-center justify-between mb-4 flex-shrink-0">
						<Dialog.Title className="text-lg font-semibold">Commits entre main y {currentTag}</Dialog.Title>
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

					{isLoading && (
						<div className="flex items-center justify-center py-8 flex-shrink-0">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Cargando diff...
							</div>
						</div>
					)}

					{error && (
						<div className="text-sm text-red-600 flex-shrink-0">
							Error al cargar el diff: {error instanceof Error ? error.message : "Error desconocido"}
						</div>
					)}

					{diffCommits && diffCommits.length > 0 ? (
						<div className="overflow-y-auto flex-1 space-y-2">
							{diffCommits.map((commit: { sha: string; commit: { message: string; author: { name: string; date: string } }; author?: { login: string } }) => (
								<div key={commit.sha} className="border rounded-lg p-3 hover:bg-muted transition-colors">
									<div className="flex items-start gap-2">
										<GitCommit className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<span className="font-mono text-xs text-muted-foreground">{commit.sha.substring(0, 7)}</span>
												<span className="text-sm font-medium truncate">{commit.commit.message.split('\n')[0]}</span>
											</div>
											<div className="text-xs text-muted-foreground">
												{commit.author?.login || commit.commit.author.name} • {new Date(commit.commit.author.date).toLocaleDateString('es-ES')}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-sm text-muted-foreground py-4 flex-shrink-0">
							No hay commits en el diff entre main y {currentTag}
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
