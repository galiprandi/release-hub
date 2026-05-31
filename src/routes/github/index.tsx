import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { Loader2, Star, Building2, FolderOpen, FolderPlus, Search, GitPullRequestCreateArrow, Settings2 } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CommitLink } from "@/components/CommitLink";
import { TagLink } from "@/components/TagLink";
import { PromoteDialog } from "@/components/PromoteDialog";
import { ForceRedeployDialog } from "@/components/ForceRedeployDialog";
import { FreezeDialog } from "@/components/FreezeDialog";
import { CommitsModal } from "@/components/CommitsModal";
import { PageLayout } from "@/layouts/PageLayout";
import { RepoSearch } from "@/components/RepoSearch";
import { FilterBar } from "@/components/shared/FilterBar";
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton";
import { Table } from "@/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useUserReposSummary } from "@/hooks/useUserReposSummary";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTagsSimple } from "@/hooks/useGitTagsSimple";
import { usePipelineWithHealth } from "@/hooks/usePipelineWithHealth";
import type { PipelineEvent } from "@/pipeline-core/types";
import { ProjectManagementDialog } from "@/components/ProjectManagementDialog";
import { EmptyState } from "@/components/EmptyState";
import DayJS from "@/lib/dayjs";

export const Route = createFileRoute("/github/")({
	component: Dashboard,
});

function Dashboard() {
	const { favorites, projects, activeTab, setActiveTab, toggleFavorite } = useUserCollections();
	const { isLoading: isLoadingRepos, data: summaryData } = useUserReposSummary();
	const { location } = useRouterState();
	const isIndexRoute = location.pathname === "/github";
	const [isManageProjectsOpen, setIsManageProjectsOpen] = useState(false);

	const tabs = useMemo(() => [
		{ value: "favorites", label: "Favoritos", icon: Star, count: favorites.length, description: "Tus repositorios marcados con estrella" },
		...projects.map(p => ({
			value: p.id,
			label: p.name,
			icon: FolderOpen,
			count: p.repos.length,
			description: p.description || `Colección ${p.name}`
		})),
	], [favorites.length, projects]);

	// Determine repos to show based on active tab
	const displayRepos = useMemo(() => {
		if (activeTab === "favorites") {
			return favorites
				.filter((f) => f.includes("/"))
				.map((f) => {
					const [org, name] = f.split("/");
					return { fullName: f, name, org, description: "", updatedAt: "" };
				});
		} else {
			const project = projects.find((p) => p.id === activeTab);
			if (project) {
				return project.repos
					.filter((r) => r.includes("/"))
					.map((r) => {
						const [org, name] = r.split("/");
						return { fullName: r, name, org, description: "", updatedAt: "" };
					});
			}
		}
		return [];
	}, [activeTab, favorites, projects]);

	// Group repos by organization
	const groupedRepos = useMemo(() => {
		return displayRepos.reduce((acc, repo) => {
			if (!acc[repo.org]) acc[repo.org] = [];
			acc[repo.org].push(repo);
			return acc;
		}, {} as Record<string, RepoInfo[]>);
	}, [displayRepos]);

	const sortedOrgs = useMemo(() => Object.keys(groupedRepos).sort(), [groupedRepos]);
	const isEmpty = displayRepos.length === 0;

	const handleManageProjects = useCallback(() => {
		setIsManageProjectsOpen(true);
	}, []);

	if (!isIndexRoute) {
		return <Outlet />;
	}

	return (
		<PageLayout
			header={{
				title: "Repositorios",
				searchComponent: <RepoSearch />
			}}
			isLoading={isLoadingRepos}
			footer={summaryData ? {
				show: true,
				left: `${summaryData.total} repos accesibles (${summaryData.orgs.length} orgs + ${summaryData.personal} personales)`,
				right: "ReleaseHub Open Source"
			} : undefined}
		>
			<div className="space-y-6">
				{/* Tabs & Management */}
				<FilterBar
					filters={tabs}
					activeFilter={activeTab}
					onFilterChange={(value) => setActiveTab(value)}
					variant="tabs"
					label="Colecciones:"
					rightContent={
						<ActionButton
							action={{ icon: Settings2, label: "Gestionar Proyectos", color: "default" }}
							onClick={handleManageProjects}
							size="md"
							className="bg-muted/40 hover:bg-muted/60"
						/>
					}
				/>

				{/* Content */}
				{isEmpty ? (
					<EmptyState
						icon={activeTab === "favorites" ? <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" /> : <FolderPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />}
						label={activeTab === "favorites" ? "Sin favoritos" : "Proyecto vacío"}
						caption={activeTab === "favorites"
							? "Agrega repositorios a tus favoritos para verlos aquí y monitorear sus despliegues."
							: "Este proyecto no tiene repositorios aún. Navega a un repositorio y agrégalo a este proyecto desde la vista de detalle."}
						action={
							<div className="flex flex-col items-center gap-4">
								{activeTab === "favorites" ? (
									<button
										type="button"
										onClick={() => {
											const input = document.querySelector('input[placeholder*="Búsqueda"]') as HTMLInputElement;
											if (input) {
												input.focus();
											}
										}}
										className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-bold uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
									>
										<Search className="w-4 h-4" />
										Buscar Repositorios
									</button>
								) : (
									<button
										type="button"
										onClick={handleManageProjects}
										className="inline-flex items-center gap-2 px-6 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all text-xs font-bold uppercase tracking-wider border border-border/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
									>
										<Settings2 className="w-4 h-4" />
										Gestionar Proyectos
									</button>
								)}
							</div>
						}
					/>
				) : (
					<div className="space-y-12">
						{sortedOrgs.map((org) => (
							<section key={org} className="space-y-3">
								<ReposTable
									org={org}
									repos={groupedRepos[org]}
									favorites={favorites}
									onToggleFavorite={toggleFavorite}
								/>
							</section>
						))}
					</div>
				)}
			</div>

			<ProjectManagementDialog
				isOpen={isManageProjectsOpen}
				onOpenChange={setIsManageProjectsOpen}
			/>
		</PageLayout>
	);
}

function ReposTable({ org, repos, favorites, onToggleFavorite }: ReposTableProps) {
	const sortedRepos = useMemo(() => [...repos].sort((a, b) => a.name.localeCompare(b.name)), [repos]);

	const columns: ColumnDef<RepoInfo>[] = useMemo(() => [
		{
			accessorKey: "name",
			header: () => (
				<div className="flex items-center gap-2">
					<Building2 className="w-4 h-4 text-primary/60" />
					<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{org}</span>
				</div>
			),
			cell: ({ row }) => <RepoNameCell repo={row.original} />,
		},
		{
			accessorKey: "tag",
			header: "Producción",
			cell: ({ row }) => <TagCell repo={row.original} />,
		},
		{
			accessorKey: "commit",
			header: "Staging",
			cell: ({ row }) => <CommitCell repo={row.original} />,
		},
		{
			accessorKey: "updatedAt",
			header: "Actividad",
			cell: ({ row }) => <DateCell repo={row.original} />,
		},
		{
			accessorKey: "author",
			header: "Autor",
			cell: ({ row }) => <AuthorCell repo={row.original} />,
		},
		{
			id: "actions",
			accessorKey: "actions",
			header: () => <div className="text-right">Acciones</div>,
			enableSorting: false,
			cell: ({ row }) => (
				<ActionsCell
					repo={row.original}
					isFavorite={favorites.includes(row.original.fullName)}
					onToggleFavorite={onToggleFavorite}
				/>
			),
		},
	], [org, favorites, onToggleFavorite]);

	return <Table columns={columns} data={sortedRepos} />;
}

function RepoNameCell({ repo }: { repo: RepoInfo }) {
	const [org, name] = repo.fullName.split("/");
	const [isCommitsModalOpen, setIsCommitsModalOpen] = useState(false);

	const { commits, isLoading: isLoadingCommits } = useGitCommits({
		repo: repo.fullName,
	});
	const { latestTag, isLoading: isLoadingTags } = useGitTagsSimple({
		repo: repo.fullName,
	});

	const prodPipeline = usePipelineWithHealth({
		product: repo.fullName,
		commit: latestTag?.commit ?? "",
		tag: latestTag?.name ?? "",
		enabled: !!latestTag?.commit && !!latestTag?.name,
	});

	const pendingCount = useMemo(() => {
		const prodCommitHash = prodPipeline.data?.git?.commit;
		if (!commits || !prodCommitHash) return 0;

		const prodCommitIndex = commits.findIndex((c) => c.hash === prodCommitHash);
		return prodCommitIndex === -1 ? commits.length : prodCommitIndex;
	}, [commits, prodPipeline.data]);

	const isLoading = isLoadingCommits || isLoadingTags;

	if (isLoading) {
		return (
			<div className="flex items-center gap-2">
				<div className="w-4 h-4 bg-muted/40 rounded-full flex-shrink-0 flex items-center justify-center">
					<Loader2 className="w-3 h-3 animate-spin text-muted-foreground/40" />
				</div>
				<div className="h-4 bg-muted/20 rounded w-32 animate-pulse" />
			</div>
		);
	}

	return (
		<>
			<div className="flex items-center gap-2 group/name">
				<Link
					to="/github/$org/$repo"
					params={{ org, repo: name }}
					search={{ view: "commits" }}
					className="font-medium tracking-tight hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-md"
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

function TagCell({ repo }: { repo: RepoInfo }) {
	const [org, name] = repo.fullName.split("/");
	const { latestTag, isLoading: isLoadingTags } = useGitTagsSimple({
		repo: repo.fullName,
	});
	const prodPipeline = usePipelineWithHealth({
		product: repo.fullName,
		commit: latestTag?.commit ?? "",
		tag: latestTag?.name ?? "",
		enabled: !!latestTag?.commit && !!latestTag?.name,
	});

	const productionStatus = useMemo(() =>
		getPipelineStatusInfo(prodPipeline.data),
		[prodPipeline.data]
	);

	if (isLoadingTags) {
		return <div className="h-4 bg-muted/20 rounded w-16 animate-pulse" />;
	}

	return latestTag?.name ? (
		<TagLink
			tagName={latestTag.name}
			org={org}
			repo={name}
			pipelineStatus={productionStatus}
			isLoading={prodPipeline.isLoading}
		/>
	) : <span className="text-muted-foreground/40 text-xs font-medium italic">Sin tags</span>;
}

function CommitCell({ repo }: { repo: RepoInfo }) {
	const [org, name] = repo.fullName.split("/");
	const { latestCommit, isLoading: isLoadingCommits } = useGitCommits({
		repo: repo.fullName,
	});
	const stagingPipeline = usePipelineWithHealth({
		product: repo.fullName,
		commit: latestCommit?.hash ?? "",
		enabled: !!latestCommit?.hash,
	});

	const stagingStatus = useMemo(() =>
		getPipelineStatusInfo(stagingPipeline.data),
		[stagingPipeline.data]
	);

	if (isLoadingCommits) {
		return <div className="h-4 bg-muted/20 rounded w-16 animate-pulse" />;
	}

	return latestCommit?.shortHash ? (
		<CommitLink
			hash={latestCommit.shortHash}
			org={org}
			repo={name}
			pipelineStatus={stagingStatus}
			isLoading={stagingPipeline.isLoading}
		/>
	) : <span className="text-muted-foreground/40 text-xs font-medium italic">Sin commits</span>;
}

function DateCell({ repo }: { repo: RepoInfo }) {
	const { latestCommit, isLoading: isLoadingCommits } = useGitCommits({
		repo: repo.fullName,
	});
	const commitDate = latestCommit?.date;

	if (isLoadingCommits) {
		return <div className="h-4 bg-muted/20 rounded w-24 animate-pulse" />;
	}

	return commitDate ? (
		<div className="text-xs font-medium text-muted-foreground">
			{DayJS(commitDate).fromNow()}
		</div>
	) : null;
}

function AuthorCell({ repo }: { repo: RepoInfo }) {
	const { latestCommit, isLoading: isLoadingCommits } = useGitCommits({
		repo: repo.fullName,
	});
	const commitAuthor = latestCommit?.author;

	if (isLoadingCommits) {
		return <div className="h-4 bg-muted/20 rounded w-32 animate-pulse" />;
	}

	const truncatedAuthor = commitAuthor && commitAuthor.length > 25
		? commitAuthor.slice(0, 25) + "..."
		: commitAuthor;

	return truncatedAuthor ? (
		<span className="text-xs text-muted-foreground/80 font-medium" title={commitAuthor}>
			{truncatedAuthor}
		</span>
	) : null;
}

function ActionsCell({ repo, isFavorite, onToggleFavorite }: { repo: RepoInfo; isFavorite: boolean; onToggleFavorite: (product: string) => void }) {
	const [org, name] = repo.fullName.split("/");
	const { latestTag } = useGitTagsSimple({
		repo: repo.fullName,
	});

	return (
		<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
			<FreezeDialog repo={repo.fullName} iconOnly={true} />
			<ForceRedeployDialog repo={repo.fullName} iconOnly={true} />
			<PromoteDialog repo={repo.fullName} latestTag={latestTag?.name} iconOnly={true} />
			<ActionButton
				action={ACTION_DEFINITIONS.openGitHub}
				onClick={() => window.open(`https://github.com/${org}/${name}`, '_blank')}
				size="sm"
			/>
			<ActionButton
				action={isFavorite ? ACTION_DEFINITIONS.removeFavorite : ACTION_DEFINITIONS.addFavorite}
				onClick={() => onToggleFavorite(repo.fullName)}
				size="sm"
			/>
		</div>
	);
}

/**
 * Unified helper to extract status information from a pipeline result.
 * Avoids multiple iterations over the events array.
 */
function getPipelineStatusInfo(data: unknown) {
	if (!data || typeof data !== "object") return { status: undefined };

	const pipeline = data as {
		events: (PipelineEvent & { label?: { es: string }; markdown?: string })[];
		updated_at: string;
	};

	if (!pipeline.events || pipeline.events.length === 0) {
		return { status: undefined };
	}

	let failedStage: string | undefined;
	let errorDetail: string | undefined;

	// Single pass to find the first failed stage and its details
	for (const event of pipeline.events) {
		if (event.state === "FAILED") {
			failedStage = event.label?.es;
			errorDetail = event.markdown;
			break;
		}
	}

	return {
		status: getDeployStatus(pipeline.events),
		updatedAt: pipeline.updated_at,
		failedStage,
		errorDetail,
	};
}

/**
 * Determines deploy status based on CD events and their subevents.
 */
function getDeployStatus(events: PipelineEvent[]) {
	if (!events || events.length === 0) return undefined;

	const lastEvent = events[events.length - 1];

	// If last event is not CD (Deployment), use its status directly
	if (lastEvent.id !== "CD") {
		return lastEvent.state;
	}

	const deploySubevents = lastEvent.subevents?.filter((se) => se.id.startsWith("DEPLOY_")) || [];

	if (deploySubevents.length === 0) {
		return lastEvent.state;
	}

	// Determine state based on deploy subevents priority: FAILED > WARN > SUCCESS
	let hasWarn = false;
	let allSuccess = true;

	for (const se of deploySubevents) {
		if (se.state === "FAILED") return "FAILED";
		if (se.state === "WARN") hasWarn = true;
		if (se.state !== "SUCCESS") allSuccess = false;
	}

	if (hasWarn) return "WARN";
	if (allSuccess) return "SUCCESS";
	return lastEvent.state;
}

type RepoInfo = {
	fullName: string;
	name: string;
	org: string;
	description: string;
	updatedAt: string;
};
type ReposTableProps = {
	org: string;
	repos: RepoInfo[];
	favorites: string[];
	onToggleFavorite: (product: string) => void;
};
