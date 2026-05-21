import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Star, Github, Building2, GitPullRequestCreateArrow, FolderOpen, FolderPlus, Search } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { DisplayInfo } from "@/components/DisplayInfo";
import { CommitLink } from "@/components/CommitLink";
import { TagLink } from "@/components/TagLink";
import { PromoteDialog } from "@/components/PromoteDialog";
import { ForceRedeployDialog } from "@/components/ForceRedeployDialog";
import { FreezeDialog } from "@/components/FreezeDialog";
import { CommitsModal } from "@/components/CommitsModal";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useUserReposSummary } from "@/hooks/useUserReposSummary";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTagsSimple } from "@/hooks/useGitTagsSimple";
import { usePipelineWithHealth } from "@/hooks/usePipelineWithHealth";

export const Route = createFileRoute("/")({
	component: Dashboard,
});

function Dashboard() {
	const { favorites, projects, activeTab, setActiveTab, toggleFavorite } = useUserCollections();
	const { isLoading: isLoadingRepos, data: summaryData } = useUserReposSummary();

	const tabs = [
		{ id: "favorites", label: "Favoritos", icon: Star, count: favorites.length, description: "" },
		...projects.map(p => ({ id: p.id, label: p.name, icon: FolderOpen, count: p.repos.length, description: p.description })),
	];

	// Determine repos to show based on active tab
	let displayRepos: RepoInfo[] = [];
	if (activeTab === "favorites") {
		displayRepos = favorites
			.filter((f) => f.includes("/"))
			.map((f) => {
				const [org, name] = f.split("/");
				return { fullName: f, name, org, description: "", updatedAt: "" };
			});
	} else {
		const project = projects.find((p) => p.id === activeTab);
		if (project) {
			displayRepos = project.repos
				.filter((r) => r.includes("/"))
				.map((r) => {
					const [org, name] = r.split("/");
					return { fullName: r, name, org, description: "", updatedAt: "" };
				});
		}
	}

	// Group repos by organization
	const groupedRepos = displayRepos.reduce((acc, repo) => {
		if (!acc[repo.org]) acc[repo.org] = [];
		acc[repo.org].push(repo);
		return acc;
	}, {} as Record<string, RepoInfo[]>);

	const sortedOrgs = Object.keys(groupedRepos).sort();

	return (
		<div className="space-y-6">
			{/* Tabs */}
			<div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 ${
								isActive
									? "bg-background shadow-sm text-foreground font-medium"
										: "text-muted-foreground hover:text-foreground hover:bg-background/50"
							}`}
							title={tab.description}
						>
							<Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
							{tab.label}
							{tab.count > 0 && (
								<span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
									{tab.count}
								</span>
								)}
						</button>
					);
				})}
			</div>

			{/* Content */}
			{displayRepos.length === 0 ? (
				<div className="border rounded-xl p-12 text-center text-muted-foreground bg-muted/20 border-dashed">
					{activeTab === "favorites" ? (
						isLoadingRepos ? (
							<>
								<Loader2 className="w-10 h-10 mx-auto mb-4 opacity-40 animate-spin" />
								<h3 className="text-lg font-medium text-foreground mb-1">Cargando repositorios</h3>
								<p className="text-sm max-w-xs mx-auto">
									Consultando organizaciones y repositorios a los que tienes acceso...
								</p>
							</>
						) : (
							<>
								<Star className="w-10 h-10 mx-auto mb-4 opacity-20" />
								<h3 className="text-lg font-medium text-foreground mb-1">Sin favoritos</h3>
								<p className="text-sm max-w-xs mx-auto mb-6">
									Agrega repositorios a tus favoritos para verlos aquí y monitorear sus despliegues.
								</p>
								<button
									type="button"
									onClick={() => {
										const input = document.querySelector('input[placeholder*="Búsqueda"]') as HTMLInputElement;
										if (input) {
											input.focus();
											// Disparar Cmd+K visualmente o simplemente abrir el dropdown si el componente lo soporta
											// En este caso, el foco en RepoSearch ya activa el estado isEditable
										}
									}}
									className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
								>
									<Search className="w-4 h-4" />
									Buscar Repositorios
								</button>
								{summaryData && (
									<div className="mt-8 pt-6 border-t border-dashed border-border/50 max-w-xs mx-auto">
										<p className="text-xs text-muted-foreground/70 mb-2">
											{summaryData.total} repositorios disponibles en tus organizaciones
										</p>
										<div className="flex flex-wrap justify-center gap-2">
											{summaryData.personal > 0 && (
												<span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
													Personales: {summaryData.personal}
												</span>
											)}
											{summaryData.orgs.map(org => (
												<span key={org.login} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
													{org.login}: {org.count}
												</span>
											))}
										</div>
									</div>
								)}
							</>
						)
					) : (
						<>
							<FolderPlus className="w-10 h-10 mx-auto mb-4 opacity-20" />
							<h3 className="text-lg font-medium text-foreground mb-1">Proyecto vacío</h3>
							<p className="text-sm max-w-xs mx-auto">
								Navega a un repositorio y agregalo a este proyecto desde la vista de detalle.
							</p>
						</>
					)}
				</div>
			) : (
				<div className="space-y-10">
					{sortedOrgs.map((org) => (
						<section key={org} className="space-y-3">
							<h2 className="text-lg font-semibold text-foreground px-4 flex items-center gap-2">
								<Building2 className="w-5 h-5" />
								{org}
							</h2>
							<ReposTable
								repos={groupedRepos[org]}
								favorites={favorites}
								onToggleFavorite={toggleFavorite}
							/>
						</section>
					))}
				</div>
			)}
		</div>
	);
}

function ReposTable({ repos, favorites, onToggleFavorite }: ReposTableProps) {
	// Ordenar repositorios alfabéticamente por name (ya que ya están filtrados por org)
	const sortedRepos = [...repos].sort((a, b) => a.name.localeCompare(b.name));

	return (
		<div className="border rounded-lg overflow-hidden">
			<table className="w-full">
				<thead className="bg-muted">
					<tr>
						<th className="px-4 py-2 text-left text-sm font-medium w-auto">
							Repositorio
						</th>
						<th className="px-4 py-2 text-left text-sm font-medium w-20">Tag</th>
						<th className="px-4 py-2 text-left text-sm font-medium w-20">Commit</th>
						<th className="px-4 py-2 text-left text-sm font-medium w-36">
							Actualización
						</th>
						<th className="px-4 py-2 text-left text-sm font-medium" style={{ width: '250px' }}>Autor</th>
						<th className="px-4 py-2 text-center text-sm font-medium w-16">
							Acciones
						</th>
					</tr>
				</thead>
				<tbody>
					{sortedRepos.map((repo) => (
						<RepoRow
							key={repo.fullName}
							repo={repo}
							isFavorite={favorites.includes(repo.fullName)}
							onToggleFavorite={onToggleFavorite}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

// Función helper para determinar el estado del deploy basado en subevents de deploy
function getDeployStatus(events: { state: string; id: string; subevents?: { id: string; state: string }[] }[]) {
	if (!events || events.length === 0) return undefined;

	const lastEvent = events[events.length - 1];

	// Si el último evento no es CD (Despliegue), usar su estado
	if (lastEvent.id !== "CD") {
		return lastEvent.state;
	}

	// Filtrar solo subevents de deploy (DEPLOY_*)
	const deploySubevents = lastEvent.subevents?.filter((se: { id: string }) => se.id.startsWith("DEPLOY_")) || [];

	if (deploySubevents.length === 0) {
		return lastEvent.state;
	}

	// Determinar el estado basado en los subevents de deploy
	const hasFailed = deploySubevents.some((se: { state: string }) => se.state === "FAILED");
	const hasWarn = deploySubevents.some((se: { state: string }) => se.state === "WARN");
	const allSuccess = deploySubevents.every((se: { state: string }) => se.state === "SUCCESS");

	if (hasFailed) return "FAILED";
	if (hasWarn) return "WARN";
	if (allSuccess) return "SUCCESS";
	return lastEvent.state;
}

function RepoRow({ repo, isFavorite, onToggleFavorite }: RepoRowProps) {
	const [org, name] = repo.fullName.split("/");
	const [isCommitsModalOpen, setIsCommitsModalOpen] = useState(false);

	const { commits, latestCommit, isLoading: isLoadingCommits } = useGitCommits({
		repo: repo.fullName,
	});
	const { latestTag, isLoading: isLoadingTags } = useGitTagsSimple({
		repo: repo.fullName,
	});

	// Obtener estado del pipeline con extracción automática de endpoints para health monitor
	const stagingPipeline = usePipelineWithHealth({
		product: repo.fullName,
		commit: latestCommit?.hash ?? "",
		enabled: !!latestCommit?.hash,
	});

	const prodPipeline = usePipelineWithHealth({
		product: repo.fullName,
		commit: latestTag?.commit ?? "",
		tag: latestTag?.name ?? "",
		enabled: !!latestTag?.commit && !!latestTag?.name,
	});

	// Calculate pending commits (between production and staging)
	const pendingCount = (() => {
		if (!commits || !prodPipeline.data?.git?.commit) return 0;
		const prodCommitIndex = commits.findIndex(c => c.hash === prodPipeline.data!.git!.commit);
		if (prodCommitIndex === -1) return commits.length;
		return prodCommitIndex;
	})();

	const commitShortHash = latestCommit?.shortHash;
	const commitAuthor = latestCommit?.author;
	const commitDate = latestCommit?.date;

	// En el home solo usamos fecha del commit (tags simples no tienen fecha)
	const latestDate = commitDate;

	// Extraer información del pipeline para staging - usar el último evento (despliegue)
	const stagingStatus = stagingPipeline.data ? {
		status: getDeployStatus(stagingPipeline.data.events),
		updatedAt: stagingPipeline.data.updated_at,
		failedStage: stagingPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.label.es,
		errorDetail: stagingPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.markdown,
	} : { status: undefined };

	// Extraer información del pipeline para production - usar el último evento (despliegue)
	const productionStatus = prodPipeline.data ? {
		status: getDeployStatus(prodPipeline.data.events),
		updatedAt: prodPipeline.data.updated_at,
		failedStage: prodPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.label.es,
		errorDetail: prodPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.markdown,
	} : { status: undefined };

	const isLoading = isLoadingCommits || isLoadingTags;
	const isStagingLoading = stagingPipeline.isLoading;
	const isProdLoading = prodPipeline.isLoading;

	if (isLoading) {
		return (
			<tr className="border-t animate-pulse">
				<td className="px-4 py-3 w-auto">
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 bg-muted rounded-full flex-shrink-0 flex items-center justify-center">
							<Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
						</div>
						<div className="h-4 bg-muted rounded w-32" />
					</div>
				</td>
				<td className="px-4 py-3 w-20">
					<div className="h-4 bg-muted rounded w-16" />
				</td>
				<td className="px-4 py-3 w-20">
					<div className="h-4 bg-muted rounded w-16" />
				</td>
				<td className="px-4 py-3 w-36">
					<div className="h-4 bg-muted rounded w-24" />
				</td>
				<td className="px-4 py-3" style={{ width: '250px' }}>
					<div className="h-4 bg-muted rounded w-40" />
				</td>
				<td className="px-4 py-3 text-center w-16">
					<div className="flex items-center justify-center gap-2">
						<div className="w-5 h-5 bg-muted rounded" />
						<div className="w-5 h-5 bg-muted rounded" />
					</div>
				</td>
			</tr>
		);
	}

	return (
		<>
			<tr className="border-t hover:bg-muted/50 group">
				<td className="px-4 py-3 w-auto">
					<div className="flex items-center gap-2">
						<Link
							to="/product/$org/$product"
							params={{ org, product: name }}
							search={{ view: "commits" }}
							className="font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-md"
						>
							{name}
						</Link>
						{pendingCount > 0 && (
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger asChild>
									<button
										type="button"
										onClick={() => setIsCommitsModalOpen(true)}
											className="inline-flex items-center gap-1 text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full border border-warning/20 font-bold cursor-pointer hover:bg-warning/20 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
									>
											<GitPullRequestCreateArrow className="w-2.5 h-2.5" />
											<span>{pendingCount}</span>
									</button>
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content
										className="bg-popover text-popover-foreground border px-2 py-1 rounded-md shadow-md text-xs z-50"
										sideOffset={5}
									>
										{pendingCount} commit{pendingCount !== 1 ? 's' : ''} pendientes de promoción a producción
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>
						</Tooltip.Provider>
						)}
					</div>
				</td>
				<td className="px-4 py-3 w-20">
					{latestTag?.name && (
						<TagLink
							tagName={latestTag.name}
							org={org}
							repo={name}
							pipelineStatus={productionStatus}
							isLoading={isProdLoading}
						/>
					)}
				</td>
				<td className="px-4 py-3 w-20">
					{commitShortHash && (
						<CommitLink
							hash={commitShortHash}
							org={org}
							repo={name}
							pipelineStatus={stagingStatus}
							isLoading={isStagingLoading}
						/>
					)}
				</td>
				<td className="px-4 py-3 text-sm text-muted-foreground w-36">
					<div className="flex items-center gap-1">
						<DisplayInfo type="dates" value={latestDate} />
					</div>
				</td>
				<td className="px-4 py-3 text-sm" style={{ width: '250px' }}>
					<div className="truncate" title={commitAuthor || undefined}>
						<DisplayInfo type="author" value={commitAuthor} hideTooltip={true} />
					</div>
				</td>
				<td className="px-4 py-3 text-center w-16">
					<div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
						<FreezeDialog repo={repo.fullName} iconOnly={true} />
						<ForceRedeployDialog repo={repo.fullName} iconOnly={true} />
						<PromoteDialog repo={repo.fullName} latestTag={latestTag?.name} iconOnly={true} />
						<a
							href={`https://github.com/${org}/${name}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-md transition-all p-1.5"
							aria-label="Abrir en GitHub"
							title="Abrir en GitHub"
						>
							<Github className="w-4 h-4" />
						</a>
						<button
							type="button"
							onClick={() => onToggleFavorite(repo.fullName)}
							className={`${isFavorite ? "text-warning" : "text-muted-foreground"} hover:text-warning/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-md transition-all p-0.5`}
							aria-label={isFavorite ? "Eliminar de favoritos" : "Agregar a favoritos"}
							title={isFavorite ? "Eliminar de favoritos" : "Agregar a favoritos"}
						>
							<Star className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
						</button>
					</div>
				</td>
			</tr>
			<CommitsModal
				isOpen={isCommitsModalOpen}
				onClose={() => setIsCommitsModalOpen(false)}
				commits={commits || []}
				prodCommitHash={prodPipeline.data?.git?.commit || ""}
				prodTag={latestTag?.name}
			/>
		</>
	);
}

type RepoInfo = {
	fullName: string;
	name: string;
	org: string;
	description: string;
	updatedAt: string;
};
type ReposTableProps = {
	repos: RepoInfo[];
	favorites: string[];
	onToggleFavorite: (product: string) => void;
};
type RepoRowProps = {
	repo: RepoInfo;
	isFavorite: boolean;
	onToggleFavorite: (product: string) => void;
};
