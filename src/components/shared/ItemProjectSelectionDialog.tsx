import { useState } from "react";
import { Check, Plus, FolderPlus, Save, X, FolderSearch } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { useUserCollections } from "@/hooks/useUserCollections";
import { EmptyState } from "./EmptyState";

interface ItemProjectSelectionDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	type: "repo" | "deployment";
	itemId: string; // repo full name or deployment id (context/namespace/name)
}

export function ItemProjectSelectionDialog({
	isOpen,
	onOpenChange,
	type,
	itemId,
}: ItemProjectSelectionDialogProps) {
	const {
		projects,
		toggleRepoInProject,
		isRepoInProject,
		toggleDeploymentInProject,
		isDeploymentInProject,
		createProject,
	} = useUserCollections();

	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");

	const itemName =
		type === "repo" ? itemId.split("/")[1] : itemId.split("/").slice(1).join("/");

	const isInProject = (projectId: string) => {
		return type === "repo"
			? isRepoInProject(projectId, itemId)
			: isDeploymentInProject(projectId, itemId);
	};

	const toggleInProject = (projectId: string) => {
		if (type === "repo") {
			toggleRepoInProject(projectId, itemId);
		} else {
			toggleDeploymentInProject(projectId, itemId);
		}
	};

	const handleQuickCreate = (e: React.FormEvent) => {
		e.preventDefault();
		if (newName.trim()) {
			createProject(newName.trim(), "");
			setNewName("");
			setIsCreating(false);
		}
	};

	return (
		<BaseDialog
			open={isOpen}
			onOpenChange={onOpenChange}
			title={
				<div className="flex items-center gap-2">
					<Plus className="w-4 h-4 text-primary" />
					<span>Asignar a Proyecto</span>
				</div>
			}
			description={`Añade o elimina "${itemName}" de tus colecciones.`}
			className="max-w-md"
		>
			<div className="space-y-4">
				<div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
					{projects.length === 0 && !isCreating ? (
						<EmptyState
							icon={<FolderSearch className="w-5 h-5 text-muted-foreground/40" />}
							label="Sin proyectos"
							caption="No tienes colecciones creadas para organizar tus recursos."
							className="min-h-0 py-8"
						/>
					) : (
						projects.map((project) => {
							const active = isInProject(project.id);
							return (
								<button
									key={project.id}
									type="button"
									aria-pressed={active}
									onClick={() => toggleInProject(project.id)}
									className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 ${
										active
											? "bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.05)]"
											: "bg-muted/10 border-border/20 hover:bg-muted/20"
									}`}
								>
									<div className="flex-1 min-w-0">
										<h4
											className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-primary" : "text-foreground"}`}
										>
											{project.name}
										</h4>
										{project.description && (
											<p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 opacity-70">
												{project.description}
											</p>
										)}
									</div>
									<div
										className={`p-1.5 rounded-lg transition-colors ${
											active
												? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
												: "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
										}`}
									>
										{active ? (
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

				{/* Quick Create Section */}
				{!isCreating ? (
					<button
						type="button"
						onClick={() => setIsCreating(true)}
						className="w-full flex items-center justify-center gap-2 p-3 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 border border-dashed border-primary/30 rounded-xl hover:bg-primary/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
					>
						<FolderPlus className="w-4 h-4" />
						Nuevo Proyecto
					</button>
				) : (
					<form
						onSubmit={handleQuickCreate}
						className="flex items-center gap-2 p-2 bg-muted/10 rounded-xl border border-border/40 animate-in fade-in slide-in-from-top-1 duration-200"
					>
						<input
							autoFocus
							type="text"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="Nombre del proyecto..."
							className="flex-1 bg-transparent border-none text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md placeholder:text-muted-foreground/40 ml-2"
						/>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="submit"
									disabled={!newName.trim()}
									aria-label="Guardar proyecto"
									className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
								>
									<Save className="w-3.5 h-3.5" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
									sideOffset={5}
								>
									Guardar proyecto
									<Tooltip.Arrow className="fill-popover" />
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>

						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="button"
									onClick={() => setIsCreating(false)}
									aria-label="Cancelar creación"
									className="p-1.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
									sideOffset={5}
								>
									Cancelar creación
									<Tooltip.Arrow className="fill-popover" />
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
					</form>
				)}

				<div className="pt-2 border-t border-border/20 flex justify-end">
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
					>
						Listo
					</button>
				</div>
			</div>
		</BaseDialog>
	);
}
