import { useState, useRef, useEffect } from "react";
import { FolderPlus, FolderOpen, X, Check, ChevronDown, Plus } from "lucide-react";
import { useUserCollections } from "@/hooks/useUserCollections";
import { BaseDialog } from "@/components/ui/BaseDialog";

export function ProjectSelector({ repo }: { repo: string }) {
	const { projects, createProject, addRepoToProject, removeRepoFromProject, isRepoInProject, getProjectsForRepo } = useUserCollections();
	const [isOpen, setIsOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDesc, setNewDesc] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
		const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
		if (isOpen) {
			document.addEventListener("mousedown", handleClick);
			document.addEventListener("keydown", handleEsc);
		}
		return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleEsc); };
	}, [isOpen]);

	const repoProjects = getProjectsForRepo(repo);
	const hasProjects = repoProjects.length > 0;

	function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		createProject(newName.trim(), newDesc.trim() || "", [repo]);
		setNewName("");
		setNewDesc("");
		setIsCreating(false);
		setIsOpen(false);
	}

	return (
		<div className="relative" ref={containerRef}>
			<button type="button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-haspopup="listbox" aria-label="Asignar a proyecto" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm">
				{hasProjects ? <><FolderOpen className="w-4 h-4 text-primary" /><span>{repoProjects.length === 1 ? repoProjects[0].name : `${repoProjects.length} proyectos`}</span></> : <><FolderPlus className="w-4 h-4" /><span>Agregar a proyecto</span></>}
				<ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
			</button>
			{isOpen && (
				<div role="listbox" className="absolute top-full right-0 md:left-0 mt-1 w-72 bg-background border rounded-lg shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
					{projects.length === 0 && !isCreating && <div className="px-3 py-2 text-sm text-muted-foreground">Sin proyectos. Crea el primero.</div>}
					{projects.map(p => {
						const inP = isRepoInProject(p.id, repo);
						return <button key={p.id} type="button" role="option" aria-selected={inP} onClick={() => { void (inP ? removeRepoFromProject(p.id, repo) : addRepoToProject(p.id, repo)); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm">
							{inP ? <Check className="w-4 h-4 text-primary" /> : <div className="w-4 h-4" />}
							<div className="flex-1 min-w-0">
								<div className="font-medium truncate">{p.name}</div>
								{p.description && <div className="text-xs text-muted-foreground truncate">{p.description}</div>}
							</div>
							{inP && <X className="w-3 h-3 text-muted-foreground" />}
						</button>;
					})}
					<div className="border-t mt-1 pt-1">
						<button
							type="button"
							onClick={() => {
								setIsCreating(true);
								setIsOpen(false);
							}}
							className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
						>
							<Plus className="w-4 h-4" /> Nuevo proyecto
						</button>
					</div>
				</div>
			)}
			<BaseDialog
				open={isCreating}
				onOpenChange={setIsCreating}
				title="Crear nuevo proyecto"
				description="Crea un nuevo proyecto para organizar tus repositorios."
				maxWidth="max-w-md"
			>
				<form onSubmit={handleCreate} className="space-y-4">
					<div>
						<label htmlFor="project-name" className="block text-sm font-medium mb-2">
							Nombre del proyecto
						</label>
						<input
							id="project-name"
							type="text"
							value={newName}
							onChange={e => setNewName(e.target.value)}
							placeholder="Ej: Frontend, Backend, Infraestructura"
							className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 bg-background"
							autoFocus
						/>
					</div>
					<div>
						<label htmlFor="project-desc" className="block text-sm font-medium mb-2">
							Descripción (opcional)
						</label>
						<input
							id="project-desc"
							type="text"
							value={newDesc}
							onChange={e => setNewDesc(e.target.value)}
							placeholder="Descripción breve del proyecto"
							className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 bg-background"
						/>
					</div>
					<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
						<button
							type="button"
							onClick={() => setIsCreating(false)}
							className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={!newName.trim()}
							className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						>
							Crear proyecto
						</button>
					</div>
				</form>
			</BaseDialog>
		</div>
	);
}
