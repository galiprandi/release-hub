import { Check, Plus } from "lucide-react";
import { BaseDialog } from "./ui/BaseDialog";
import { useUserCollections } from "@/hooks/useUserCollections";

interface ProjectSelectionDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	repoFullName: string;
}

export function ProjectSelectionDialog({ isOpen, onOpenChange, repoFullName }: ProjectSelectionDialogProps) {
	const { projects, toggleRepoInProject, isRepoInProject } = useUserCollections();
	const [, repoName] = repoFullName.split("/");

	return (
		<BaseDialog
			open={isOpen}
			onOpenChange={onOpenChange}
			title="Gestionar Proyectos"
			description={`Añade o elimina "${repoName}" de tus colecciones.`}
			className="max-w-md"
		>
			<div className="space-y-4">
				<div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
					{projects.length === 0 ? (
						<div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed border-border/20">
							<p className="text-sm text-muted-foreground">No tienes proyectos creados.</p>
						</div>
					) : (
						projects.map((project) => {
							const isInProject = isRepoInProject(project.id, repoFullName);
							return (
								<button
									key={project.id}
									onClick={() => toggleRepoInProject(project.id, repoFullName)}
									className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary/20 ${
										isInProject
											? "bg-primary/5 border-primary/20 hover:bg-primary/10"
											: "bg-muted/10 border-border/20 hover:bg-muted/20"
									}`}
								>
									<div className="flex-1 min-w-0">
										<h4 className={`text-xs font-bold uppercase tracking-wider ${isInProject ? "text-primary" : "text-foreground"}`}>
											{project.name}
										</h4>
										{project.description && (
											<p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
												{project.description}
											</p>
										)}
									</div>
									<div className={`p-1.5 rounded-lg transition-colors ${
										isInProject
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
									}`}>
										{isInProject ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
									</div>
								</button>
							);
						})
					)}
				</div>

				<div className="pt-2 border-t border-border/20 flex justify-end">
					<button
						onClick={() => onOpenChange(false)}
						className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider bg-muted/20 text-foreground rounded-lg hover:bg-muted/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
					>
						Cerrar
					</button>
				</div>
			</div>
		</BaseDialog>
	);
}
