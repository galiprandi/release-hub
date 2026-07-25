import { useState } from "react";
import { FolderPlus, FolderEdit, Save, X, FolderKanban } from "lucide-react";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton";
import { useUserCollections, type Project } from "@/hooks/useUserCollections";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";

interface ProjectManagementDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ProjectManagementDialog({ isOpen, onOpenChange }: ProjectManagementDialogProps) {
	const { projects, createProject, deleteProject, updateProject } = useUserCollections();
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [editingProject, setEditingProject] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");

	// State for delete confirmation
	const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		if (newName.trim()) {
			createProject(newName.trim(), newDescription.trim());
			setNewName("");
			setNewDescription("");
			setIsCreating(false);
		}
	};

	const handleStartEdit = (project: Project) => {
		setEditingProject(project.id);
		setEditName(project.name);
		setEditDescription(project.description);
	};

	const handleSaveEdit = (id: string) => {
		if (editName.trim()) {
			updateProject(id, { name: editName.trim(), description: editDescription.trim() });
			setEditingProject(null);
		}
	};

	const handleDeleteConfirm = () => {
		if (projectToDelete) {
			deleteProject(projectToDelete.id);
			setProjectToDelete(null);
		}
	};

	return (
		<>
			<BaseDialog
				open={isOpen}
				onOpenChange={onOpenChange}
				title={
					<div className="flex items-center gap-2">
						<FolderKanban className="w-4 h-4 text-primary" />
						<span>Gestionar Proyectos</span>
					</div>
				}
				description="Crea, edita o elimina tus colecciones de repositorios."
				className="max-w-2xl"
			>
				<div className="space-y-6">
					{/* List Projects */}
					<div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
						{projects.length === 0 && !isCreating && (
							<EmptyState
								className="min-h-0 py-12"
								icon={<FolderKanban className="w-5 h-5 text-muted-foreground/40" />}
								label="No tienes proyectos creados"
								caption="Crea una colección para organizar tus repositorios y deployments de forma centralizada."
							/>
						)}

						{projects.map((project) => (
							<div
								key={project.id}
								className="group flex items-start justify-between p-4 bg-muted/30 rounded-md border border-border hover:bg-muted/30 transition-all"
							>
								{editingProject === project.id ? (
									<div className="flex-1 space-y-3 mr-4">
										<div className="space-y-1">
											<label htmlFor={`edit-name-${project.id}`} className="text-xs font-medium text-muted-foreground/60 ml-1">Nombre</label>
											<input
												id={`edit-name-${project.id}`}
												autoFocus
												type="text"
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
												placeholder="Nombre del proyecto"
											/>
										</div>
										<div className="space-y-1">
											<label htmlFor={`edit-desc-${project.id}`} className="text-xs font-medium text-muted-foreground/60 ml-1">Descripción</label>
											<textarea
												id={`edit-desc-${project.id}`}
												value={editDescription}
												onChange={(e) => setEditDescription(e.target.value)}
												className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:outline-none h-20 resize-none transition-all"
												placeholder="Descripción (opcional)"
											/>
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => handleSaveEdit(project.id)}
												className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none"
											>
												<Save className="w-3.5 h-3.5" />
												Guardar
											</button>
											<button
												onClick={() => setEditingProject(null)}
												className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none"
											>
												<X className="w-3.5 h-3.5" />
												Cancelar
											</button>
										</div>
									</div>
								) : (
									<>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<h4 className="font-bold tracking-tight text-foreground uppercase text-[11px]">
													{project.name}
												</h4>
												<span className="text-xs font-bold text-muted-foreground/40 bg-muted/30 px-1.5 rounded">
													{project.repos.length} REPOS
												</span>
											</div>
											{project.description && (
												<p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
													{project.description}
												</p>
											)}
										</div>
										<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
											<ActionButton
												action={{ icon: FolderEdit, label: "Editar", color: "default" }}
												onClick={() => handleStartEdit(project)}
												size="sm"
											/>
											<ActionButton
												action={{ ...ACTION_DEFINITIONS.delete, label: "Eliminar" }}
												onClick={() => setProjectToDelete(project)}
												size="sm"
											/>
										</div>
									</>
								)}
							</div>
						))}
					</div>

					{/* Create Section */}
					{!isCreating ? (
						<button
							onClick={() => setIsCreating(true)}
							className="w-full py-4 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.1em] border border-dashed border-primary/40 text-primary rounded-md hover:bg-primary/5 transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none group"
						>
							<FolderPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
							Nuevo Proyecto
						</button>
					) : (
						<form onSubmit={handleCreate} className="p-5 bg-primary/5 rounded-md border border-primary/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
							<h4 className="text-xs font-medium text-primary">Crear nuevo proyecto</h4>
							<div className="space-y-4">
								<div className="space-y-1.5">
									<label htmlFor="projectName" className="text-xs font-medium text-muted-foreground/60 ml-1">
										Nombre
									</label>
									<input
										id="projectName"
										autoFocus
										type="text"
										required
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
										className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
										placeholder="Ej: Microservicios Core"
									/>
								</div>
								<div className="space-y-1.5">
									<label htmlFor="projectDesc" className="text-xs font-medium text-muted-foreground/60 ml-1">
										Descripción
									</label>
									<textarea
										id="projectDesc"
										value={newDescription}
										onChange={(e) => setNewDescription(e.target.value)}
										className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:outline-none h-20 resize-none transition-all"
										placeholder="Breve descripción del propósito de esta colección..."
									/>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="submit"
									className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none"
								>
									Crear Proyecto
								</button>
								<button
									type="button"
									onClick={() => setIsCreating(false)}
									className="px-4 py-2 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none"
								>
									Cancelar
								</button>
							</div>
						</form>
					)}

					<div className="pt-4 border-t border-border flex justify-end">
						<button
							onClick={() => onOpenChange(false)}
							className="px-6 py-2 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none"
						>
							Listo
						</button>
					</div>
				</div>
			</BaseDialog>

			<ConfirmDialog
				open={!!projectToDelete}
				onOpenChange={(open) => !open && setProjectToDelete(null)}
				onConfirm={handleDeleteConfirm}
				title="Eliminar Proyecto"
				description={`¿Estás seguro de que quieres eliminar el proyecto "${projectToDelete?.name}"? Esta acción no se puede deshacer.`}
				variant="destructive"
			/>
		</>
	);
}
