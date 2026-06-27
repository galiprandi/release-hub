import { useState, useRef, useEffect } from "react";
import { FolderPlus, FolderOpen, ChevronDown } from "lucide-react";
import { useUserCollections } from "@/hooks/useUserCollections";
import { ItemProjectSelectionDialog } from "./ItemProjectSelectionDialog";

export function ProjectSelector({ repo }: { repo: string }) {
	const { getProjectsForRepo } = useUserCollections();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			)
				setIsOpen(false);
		};
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClick);
			document.addEventListener("keydown", handleEsc);
		}
		return () => {
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("keydown", handleEsc);
		};
	}, [isOpen]);

	const repoProjects = getProjectsForRepo(repo);
	const hasProjects = repoProjects.length > 0;

	return (
		<div className="relative" ref={containerRef}>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				aria-label="Asignar a proyecto"
				className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border/40 hover:bg-muted/60 transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none rounded-lg group"
			>
				{hasProjects ? (
					<>
						<FolderOpen className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
						<span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
							{repoProjects.length === 1
								? repoProjects[0].name
								: `${repoProjects.length} PROYECTOS`}
						</span>
					</>
				) : (
					<>
						<FolderPlus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
							PROYECTOS
						</span>
					</>
				)
				}
				<ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
			</button>

			<ItemProjectSelectionDialog
				isOpen={isOpen}
				onOpenChange={setIsOpen}
				itemId={repo}
				type="repo"
			/>
		</div>
	);
}
