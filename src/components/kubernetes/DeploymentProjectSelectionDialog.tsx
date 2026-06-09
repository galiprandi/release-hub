import { useUserCollections } from "@/hooks/useUserCollections";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { Check } from "lucide-react";

interface DeploymentProjectSelectionDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	deploymentId: string; // format: context/namespace/name
}

export function DeploymentProjectSelectionDialog({
	isOpen,
	onOpenChange,
	deploymentId,
}: DeploymentProjectSelectionDialogProps) {
	const { projects, toggleDeploymentInProject, isDeploymentInProject } = useUserCollections();

	const [context, namespace, name] = deploymentId.split("/");

	return (
		<BaseDialog
			open={isOpen}
			onOpenChange={onOpenChange}
			title="Asignar a Proyecto"
			description={`Selecciona los proyectos donde quieres incluir este deployment: ${namespace}/${name} en ${context}`}
			className="max-w-md"
		>
			<div className="space-y-4">
				<div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
					{projects.length === 0 ? (
						<div className="text-center py-6 bg-muted/10 rounded-xl border border-dashed border-border/60">
							<p className="text-sm text-muted-foreground">No tienes proyectos creados.</p>
						</div>
					) : (
						projects.map((project) => {
							const isInProject = isDeploymentInProject(project.id, deploymentId);
							return (
								<button
									key={project.id}
									onClick={() => toggleDeploymentInProject(project.id, deploymentId)}
									className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left group relative overflow-hidden ${
										isInProject
											? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
											: "bg-muted/10 border-border/40 hover:bg-muted/20"
									}`}
								>
									<div className="flex-1 min-w-0 relative z-10">
										<h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
											{project.name}
											{isInProject && <Check className="w-3 h-3 text-primary" />}
										</h4>
										{project.description && (
											<p className="text-[10px] text-muted-foreground/60 mt-1 line-clamp-1 italic">
												{project.description}
											</p>
										)}
									</div>
									{isInProject && (
										<div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl" />
									)}
								</button>
							);
						})
					)}
				</div>

				<div className="pt-4 border-t border-border/40 flex justify-between items-center">
					<div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						{projects.length} Proyectos disponibles
					</div>
					<button
						onClick={() => onOpenChange(false)}
						className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						Listo
					</button>
				</div>
			</div>
		</BaseDialog>
	);
}
