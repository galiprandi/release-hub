import { useState } from "react";
import { FolderPlus, FolderEdit, Save, X } from "lucide-react";
import { BaseDialog } from "./ui/BaseDialog";
import { ActionButton, ACTION_DEFINITIONS } from "./ui/ActionButton";
import { useUserCollections, type Project } from "@/hooks/useUserCollections";

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

	return (
		<BaseDialog
			open={isOpen}
			onOpenChange={onOpenChange}
			title="Gestionar Proyectos"
			description="Crea, edita o elimina tus colecciones de repositorios."
			className="max-w-2xl"
		>
			<div className="space-y-6">
				{/* List Projects */}
				<div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
					{projects.length === 0 && !isCreating && (
						<div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed border-border/60">
							<p className="text-sm text-muted-foreground">No tienes proyectos creados.</p>
						</div>
					)}

					{projects.map((project) => (
						<div
							key={project.id}
							className="group flex items-start justify-between p-4 bg-muted/10 rounded-xl border border-border/40 hover:bg-muted/20 transition-all"
						>
							{editingProject === project.id ? (
								<div className="flex-1 space-y-3 mr-4">
									<input
										autoFocus
										type="text"
										value={editName}
										onChange={(e) => setEditName(e.target.value)}
										className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
										placeholder="Nombre del proyecto"
									/>
									<textarea
										value={editDescription}
										onChange={(e) => setEditDescription(e.target.value)}
										className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:outline-none h-20 resize-none"
										placeholder="Descripción (opcional)"
									/>
									<div className="flex items-center gap-2">
										<button
											onClick={() => handleSaveEdit(project.id)}
											className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:opacity-90"
										>
											<Save className="w-3.5 h-3.5" />
											Guardar
										</button>
										<button
											onClick={() => setEditingProject(null)}
											className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-muted text-foreground rounded-lg hover:bg-muted/80"
										>
											<X className="w-3.5 h-3.5" />
											Cancelar
										</button>
									</div>
								</div>
							) : (
								<>
									<div className="flex-1 min-w-0">
										<h4 className="font-bold tracking-tight text-foreground flex items-center gap-2 uppercase text-xs">
											{project.name}
											<span className="text-[10px] font-bold text-muted-foreground/60">
												({project.repos.length} repos)
											</span>
										</h4>
										{project.description && (
											<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
												{project.description}
											</p>
										)}
									</div>
									<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<ActionButton
											action={{ icon: FolderEdit, label: "Editar", color: "default" }}
											onClick={() => handleStartEdit(project)}
											size="sm"
										/>
										<ActionButton
											action={{ ...ACTION_DEFINITIONS.delete, label: "Eliminar" }}
											onClick={() => {
												if (confirm(`¿Estás seguro de eliminar el proyecto "${project.name}"?`)) {
													deleteProject(project.id);
												}
											}}
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
						className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider border border-dashed border-primary/40 text-primary rounded-xl hover:bg-primary/5 transition-all"
					>
						<FolderPlus className="w-4 h-4" />
						Nuevo Proyecto
					</button>
				) : (
					<form onSubmit={handleCreate} className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
						<h4 className="text-xs font-bold uppercase tracking-wider text-primary">Crear nuevo proyecto</h4>
						<div className="space-y-3">
							<div className="space-y-1">
								<label htmlFor="projectName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
									Nombre
								</label>
								<input
									id="projectName"
									autoFocus
									type="text"
									required
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
									placeholder="Ej: Microservicios Core"
								/>
							</div>
							<div className="space-y-1">
								<label htmlFor="projectDesc" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
									Descripción
								</label>
								<textarea
									id="projectDesc"
									value={newDescription}
									onChange={(e) => setNewDescription(e.target.value)}
									className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:outline-none h-20 resize-none"
									placeholder="Breve descripción del propósito de esta colección..."
								/>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="submit"
								className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm"
							>
								Crear Proyecto
							</button>
							<button
								type="button"
								onClick={() => setIsCreating(false)}
								className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all"
							>
								Cancelar
							</button>
						</div>
					</form>
				)}

				<div className="pt-4 flex justify-end">
					<button
						onClick={() => onOpenChange(false)}
						className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all"
					>
						Listo
					</button>
				</div>
			</div>
		</BaseDialog>
	);
}
