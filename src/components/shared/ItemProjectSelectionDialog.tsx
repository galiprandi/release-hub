import { Check, Plus } from "lucide-react";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { useUserCollections } from "@/hooks/useUserCollections";

interface ItemProjectSelectionDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	itemId: string;
	type: "repo" | "deployment";
}

export function ItemProjectSelectionDialog({
	isOpen,
	onOpenChange,
	itemId,
	type,
}: ItemProjectSelectionDialogProps) {
	const {
		projects,
		toggleRepoInProject,
		isRepoInProject,
		toggleDeploymentInProject,
		isDeploymentInProject,
	} = useUserCollections();

	const isRepo = type === "repo";
	const itemName = isRepo ? itemId.split("/")[1] : itemId.split("/")[2];
	const context = !isRepo ? itemId.split("/")[0] : null;

	const isInProject = (projectId: string) =>
		isRepo
			? isRepoInProject(projectId, itemId)
			: isDeploymentInProject(projectId, itemId);

	const toggleInProject = (projectId: string) =>
		isRepo
			? toggleRepoInProject(projectId, itemId)
			: toggleDeploymentInProject(projectId, itemId);

	return (
		<BaseDialog
			open={isOpen}
			onOpenChange={onOpenChange}
			title={
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Asignar a Proyecto:
					</span>
					<span className="text-sm font-bold tracking-tight">{itemName}</span>
				</div>
			}
			description={
				isRepo
					? `Gestiona las colecciones de "${itemName}"`
					: `Gestiona las colecciones de "${itemName}" en ${context}`
			}
			className="max-w-md"
		>
			<div className="space-y-4">
				<div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
					{projects.length === 0 ? (
						<div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed border-border/40">
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
								No tienes proyectos creados
							</p>
						</div>
					) : (
						projects.map((project) => {
							const inP = isInProject(project.id);
							return (
								<button
									key={project.id}
									onClick={() => toggleInProject(project.id)}
									className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary/20 ${
										inP
											? "bg-primary/5 border-primary/20 hover:bg-primary/10"
											: "bg-muted/10 border-border/40 hover:bg-muted/20"
									}`}
								>
									<div className="flex-1 min-w-0">
										<h4
											className={`text-[10px] font-bold uppercase tracking-wider ${inP ? "text-primary" : "text-foreground"}`}
										>
											{project.name}
										</h4>
										{project.description && (
											<p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
												{project.description}
											</p>
										)}
									</div>
									<div
										className={`p-1.5 rounded-lg transition-colors ${
											inP
												? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]"
												: "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
										}`}
									>
										{inP ? (
											<Check className="w-3.5 h-3.5" />
										) : (
											<Plus className="w-3.5 h-3.5" />
										)}
									</div>
								</button>
							);
						})
					)}
				</div>

				<div className="pt-3 border-t border-border/40 flex justify-end">
					<button
						onClick={() => onOpenChange(false)}
						className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
					>
						Listo
					</button>
				</div>
			</div>
		</BaseDialog>
	);
}
