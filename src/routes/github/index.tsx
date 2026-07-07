import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import { z } from "zod";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
	useRouterState,
	useSearch,
} from "@tanstack/react-router";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
	Building2,
	ChevronDown,
	ChevronRight,
	FolderOpen,
	FolderPlus,
	Github,
	GitPullRequest,
	GitPullRequestCreateArrow,
	Loader2,
	Play,
	RefreshCw,
	Search,
	Settings2,
	Star,
} from "lucide-react";
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton";
import { Table } from "@/components/ui/Table";
import { CommitLink } from "@/github/components/CommitLink";
import { TagLink } from "@/github/components/TagLink";
import { PromoteDialog } from "@/github/components/PromoteDialog";
import { ForceRedeployDialog } from "@/github/components/ForceRedeployDialog";
import { FreezeDialog } from "@/github/components/FreezeDialog";
import { CommitsModal } from "@/github/components/CommitsModal";
import { PageLayout } from "@/layouts/PageLayout";
import { RepoSearch } from "@/github/components/RepoSearch";
import { IndustrialTabs } from "@/components/shared/IndustrialTabs";
import { ProjectManagementDialog } from "@/github/components/ProjectManagementDialog";
import { ItemProjectSelectionDialog } from "@/components/shared/ItemProjectSelectionDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useUserReposSummary } from "@/hooks/useUserReposSummary";
import { usePipelineWithHealth } from "@/plugins/pipeline/seki/hooks/usePipelineWithHealth";
import { useHealthMonitor } from "@/plugins/pipeline/seki/hooks/useHealthMonitor";
import {
	useRepoDashboardDetails,
	type RepoDetails,
	type Commit,
	type Tag,
} from "@/hooks/useRepoDashboardDetails";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";
import { runCommand } from "@/api/exec";
import DayJS from "@/lib/dayjs";
import { getPipelineStatusInfo } from "@/plugins/pipeline/seki/utils";

const dashboardSearchSchema = z.object({
	tab: z.string().optional().catch("favorites"),
	filter: z.string().optional(),
});

export const Route = createFileRoute("/github/")({
	validateSearch: (search) => dashboardSearchSchema.parse(search),
	component: Dashboard,
});

function Dashboard() {
	const { tab: activeTab = "favorites", filter: activeFilter } = useSearch({
		from: "/github/",
	});
	const navigate = useNavigate({ from: "/github/" });
	const { favorites, projects, toggleFavorite } = useUserCollections();
	const { isLoading: isLoadingRepos, data: summaryData } =
		useUserReposSummary();
	const { location } = useRouterState();
	const isIndexRoute = location.pathname === "/github";
	const [isManageProjectsOpen, setIsManageProjectsOpen] = useState(false);
	const queryClient = useQueryClient();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(() => {
		setIsRefreshing(true);
		queryClient.invalidateQueries({
			queryKey: ["git", "dashboard-details"],
			exact: false,
		});
		setTimeout(() => setIsRefreshing(false), 1000);
	}, [queryClient]);

	const [collapsedOrgs, setCollapsedOrgs] = useState<Record<string, boolean>>(
		{},
	);

	const tabs = useMemo(
		() => [
			{
				value: "favorites",
				label: "Favoritos",
				icon: Star,
				count: favorites.length,
				description: "Tus repositorios marcados con estrella",
			},
			...projects.map((p) => ({
				value: p.id,
				label: p.name,
				icon: FolderOpen,
				count: p.repos.length,
				description: p.description || `Colección ${p.name}`,
			})),
		],
		[favorites.length, projects],
	);

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
		return displayRepos.reduce(
			(acc, repo) => {
				if (!acc[repo.org]) acc[repo.org] = [];
				acc[repo.org].push(repo);
				return acc;
			},
			{} as Record<string, RepoInfo[]>,
		);
	}, [displayRepos]);

	const sortedOrgs = useMemo(
		() => Object.keys(groupedRepos).sort(),
		[groupedRepos],
	);
	const isEmpty = displayRepos.length === 0;

	const isAllCollapsed = useMemo(
		() =>
			sortedOrgs.length > 0 && sortedOrgs.every((org) => collapsedOrgs[org]),
		[sortedOrgs, collapsedOrgs],
	);

	const toggleOrgCollapse = useCallback((org: string) => {
		setCollapsedOrgs((prev) => ({
			...prev,
			[org]: !prev[org],
		}));
	}, []);

	const toggleAllCollapse = useCallback(() => {
		const newState = !isAllCollapsed;
		const nextCollapsed: Record<string, boolean> = {};
		for (const org of sortedOrgs) {
			nextCollapsed[org] = newState;
		}
		setCollapsedOrgs(nextCollapsed);
	}, [isAllCollapsed, sortedOrgs]);

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
				searchComponent: (
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
								Colecciones:
							</span>
							<IndustrialTabs
								options={tabs.map((t) => ({
									id: t.value,
									label: (
										<div className="flex items-center gap-1.5">
											{t.icon && <t.icon className="w-3 h-3" />}
											<span>{t.label}</span>
											{t.count !== undefined && t.count > 0 && (
												<span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted-foreground/10 text-[10px]">
													{t.count}
												</span>
											)}
										</div>
									),
								}))}
								activeId={activeTab}
								onChange={(id) =>
									navigate({
										search: (prev: Record<string, unknown>) => ({
											...prev,
											tab: id as string,
										}),
									})
								}
							/>
						</div>
						<div className="w-px h-6 bg-border/40 mx-1" />
						<RepoSearch />
					</div>
				),
			}}
			actions={[
				<ActionButton
					key="refresh"
					action={{
						icon: RefreshCw,
						label: "Actualizar",
						color: "default",
					}}
					showLabel={true}
					onClick={handleRefresh}
					size="md"
					className="bg-muted/20 hover:bg-muted/30"
					disabled={isRefreshing}
				/>,
				<ActionButton
					key="manage-projects"
					action={{
						icon: Settings2,
						label: "Gestionar Proyectos",
						color: "default",
					}}
					showLabel={true}
					onClick={handleManageProjects}
					size="md"
					className="bg-muted/20 hover:bg-muted/30"
				/>,
			]}
			isLoading={isLoadingRepos}
			footer={
				summaryData
					? {
							show: true,
							left: `${summaryData.total} repos accesibles (${summaryData.orgs.length} orgs + ${summaryData.personal} personales)`,
							right: (
								<a
									href="https://github.com/galiprandi/release-hub"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1.5 hover:text-foreground transition-colors"
								>
									<Github className="w-3.5 h-3.5" />
									ReleaseHub
								</a>
							),
						}
					: undefined
			}
		>
			<div className="space-y-6">
				{/* Global Filters & Bulk Actions */}
				{!isEmpty && (
					<div className="flex items-center justify-between px-1">
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
								Filtrar:
							</span>
							<div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
								<IndustrialTabs
									options={[
										{ id: "all", label: "Todos" },
										{ id: "true", label: "Pendientes" },
									]}
									activeId={activeFilter || "all"}
									onChange={(id) =>
										navigate({
											search: (prev: Record<string, unknown>) => ({
												...prev,
												filter: id === "all" ? undefined : (id as string),
											}),
										})
									}
								/>
							</div>
						</div>

						{sortedOrgs.length > 1 && (
							<button
								type="button"
								onClick={toggleAllCollapse}
								className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all border border-transparent hover:border-border/40"
							>
								{isAllCollapsed ? (
									<>
										<ChevronDown className="w-3.5 h-3.5" />
										Expandir Todo
									</>
								) : (
									<>
										<ChevronRight className="w-3.5 h-3.5" />
										Colapsar Todo
									</>
								)}
							</button>
						)}
					</div>
				)}

				{/* Content */}
				{isEmpty ? (
					<EmptyState
						icon={
							activeTab === "favorites" ? (
								<Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
							) : (
								<FolderPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
							)
						}
						label={
							activeTab === "favorites" ? "Sin favoritos" : "Proyecto vacío"
						}
						caption={
							activeTab === "favorites"
								? "Agrega repositorios a tus favoritos para verlos aquí y monitorear sus despliegues."
								: "Este proyecto no tiene repositorios aún. Navega a un repositorio y agrégalo a este proyecto desde la vista de detalle."
						}
						action={
							<div className="flex flex-col items-center gap-4">
								{activeTab === "favorites" ? (
									<button
										type="button"
										onClick={() => {
											const input = document.querySelector(
												'input[placeholder*="Búsqueda"]',
											) as HTMLInputElement;
											if (input) {
												input.focus();
											}
										}}
										className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-bold uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
									>
										<Search className="w-4 h-4" />
										Descubrir Repositorios
									</button>
								) : (
									<div className="flex flex-wrap items-center justify-center gap-3">
										<button
											type="button"
											onClick={() => {
												const input = document.querySelector(
													'input[placeholder*="Búsqueda"]',
												) as HTMLInputElement;
												if (input) {
													input.focus();
												}
											}}
											className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-bold uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
										>
											<Search className="w-4 h-4" />
											Añadir Repositorios
										</button>
										<button
											type="button"
											onClick={handleManageProjects}
											className="inline-flex items-center gap-2 px-6 py-2.5 bg-muted/20 text-foreground rounded-lg hover:bg-muted/30 transition-all text-xs font-bold uppercase tracking-wider border border-border/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
										>
											<Settings2 className="w-4 h-4" />
											Gestionar Proyecto
										</button>
									</div>
								)}
							</div>
						}
					/>
				) : (
					<div className="space-y-6">
						{sortedOrgs.map((org) => {
							const isCollapsed = collapsedOrgs[org];
							const repoCount = groupedRepos[org].length;

							return (
								<section
									key={org}
									className={clsx(
										"rounded-xl border border-border/40 overflow-hidden transition-all duration-300",
										isCollapsed ? "bg-muted/5" : "bg-muted/10 space-y-3 pb-4",
									)}
								>
									<header
										onClick={() => toggleOrgCollapse(org)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												toggleOrgCollapse(org);
											}
										}}
										tabIndex={0}
										className={clsx(
											"flex items-center justify-between px-4 py-2 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors group",
											!isCollapsed && "border-b border-border/40 mb-3",
										)}
									>
										<div className="flex items-center gap-3">
											{isCollapsed ? (
												<ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
											) : (
												<ChevronDown className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
											)}
											<div className="flex items-center gap-2">
												<Building2 className="w-4 h-4 text-primary/60" />
												<h2 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
													{org}
												</h2>
												<span className="px-1.5 py-0.5 rounded-full bg-muted-foreground/10 text-[10px] font-bold text-muted-foreground/60">
													{repoCount}
												</span>
											</div>
										</div>

										{isCollapsed && (
											<div className="flex items-center gap-4">
												<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 italic">
													Click para expandir
												</span>
											</div>
										)}
									</header>

									{!isCollapsed && (
										<div className="px-4">
											<ReposTable
												repos={groupedRepos[org]}
												favorites={favorites}
												onToggleFavorite={toggleFavorite}
											/>
										</div>
									)}
								</section>
							);
						})}
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

function ReposTable({
	repos,
	favorites,
	onToggleFavorite,
}: ReposTableProps) {
	const { filter: activeFilter } = useSearch({ from: "/github/" });
	const sortedRepos = useMemo(
		() => [...repos].sort((a, b) => a.name.localeCompare(b.name)),
		[repos],
	);

	// Fetch data for all repos to handle filtering at the table level
	const repoDetailsQueries = useQueries({
		queries: sortedRepos.map((repo) => ({
			queryKey: queryKeys.git.dashboardDetails(repo.fullName),
			queryFn: async () => {
				const query = `
					query($owner: String!, $name: String!) {
						repository(owner: $owner, name: $name) {
							pullRequests(states: OPEN) {
								totalCount
							}
							refs(refPrefix: "refs/tags/", last: 1) {
								nodes {
									name
									target {
										oid
										... on Tag {
											target {
												oid
											}
										}
									}
								}
							}
							ref(qualifiedName: "refs/heads/main") {
								target {
									... on Commit {
										history(first: 10) {
											nodes {
												oid
												message
												committedDate
												author {
													name
												}
											}
										}
									}
								}
							}
						}
					}
				`;

				const gqlRes = await runCommand([
					"gh",
					"api",
					"graphql",
					"-f",
					`query=${query}`,
					"-f",
					`owner=${repo.org}`,
					"-f",
					`name=${repo.name}`,
				]);

				const data = JSON.parse(gqlRes.stdout).data.repository;
				if (!data) throw new Error("Repository not found");

				const rawCommits = (data.ref?.target?.history?.nodes ||
					[]) as Array<{
					oid: string;
					message: string;
					committedDate: string;
					author: { name: string };
				}>;
				const commits: Commit[] = rawCommits.map((c) => {
					const [subject, ...bodyParts] = c.message.split("\n");
					return {
						hash: c.oid,
						shortHash: c.oid.substring(0, 7),
						author: c.author.name,
						date: c.committedDate,
						message: c.message,
						subject: subject.trim(),
						body: bodyParts.join("\n").trim(),
					};
				});

				const rawTag = data.refs.nodes[0] as
					| {
							name: string;
							target: {
								oid: string;
								target?: { oid: string };
							};
					  }
					| undefined;
				const latestTag: Tag | null = rawTag
					? {
							name: rawTag.name,
							commit: rawTag.target.target?.oid || rawTag.target.oid,
						}
					: null;

				const prCount = data.pullRequests.totalCount;

				// Actions summary still via REST as it's more reliable/direct for workflow runs
				const actionsRes = await runCommand([
					"gh",
					"api",
					`repos/${repo.fullName}/actions/runs?per_page=5`,
					"--jq",
					".workflow_runs[] | {status, conclusion}",
				]);
				const actionLines = actionsRes.stdout
					.trim()
					.split("\n")
					.filter((line) => line.startsWith("{"));
				const runs = actionLines
					.map((line) => {
						try {
							return JSON.parse(line);
						} catch {
							return null;
						}
					})
					.filter(Boolean) as { status: string; conclusion: string | null }[];

				// Calculate pending
				let pendingCount = 0;
				if (latestTag && commits.length > 0) {
					const prodIndex = commits.findIndex(
						(c) => c.hash === latestTag.commit,
					);
					pendingCount = prodIndex === -1 ? commits.length : prodIndex;
				}

				return {
					fullName: repo.fullName,
					pendingCount,
					latestTag,
					commits,
					prCount,
					actions: {
						total: runs.length,
						running: runs.filter((r) => r.status === "in_progress").length,
						failed: runs.filter((r) => r.conclusion === "failure").length,
					},
				};
			},
			...applyCachePolicy("git"),
		})),
	});

	const reposWithPending = useMemo(() => {
		const pendingSet = new Set<string>();
		repoDetailsQueries.forEach((query) => {
			const data = query.data;
			if (data && data.pendingCount > 0) {
				pendingSet.add(data.fullName);
			}
		});
		return pendingSet;
	}, [repoDetailsQueries]);

	const columns: ColumnDef<RepoInfo>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Repositorio
					</span>
				),
				cell: ({ row }) => <RepoNameCell repo={row.original} />,
			},
			{
				id: "pending_filter",
				accessorKey: "fullName",
				header: "Pendientes",
				enableHiding: true,
				cell: () => null,
				filterFn: (row, _columnId, filterValue) => {
					if (!filterValue) return true;
					return reposWithPending.has(row.original.fullName);
				},
			},
			{
				accessorKey: "tag",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Producción
					</span>
				),
				cell: ({ row }) => <TagCell repo={row.original} />,
			},
			{
				accessorKey: "commit",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Staging
					</span>
				),
				cell: ({ row }) => <CommitCell repo={row.original} />,
			},
			{
				id: "health",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Salud
					</span>
				),
				cell: ({ row }) => <HealthCell repo={row.original} />,
			},
			{
				id: "prs",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						PRs
					</span>
				),
				cell: ({ row }) => {
					const details = repoDetailsQueries.find(
						(q) => q.data?.fullName === row.original.fullName,
					)?.data;
					return <PRsCell repo={row.original} details={details} />;
				},
			},
			{
				id: "actions_status",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Workflows
					</span>
				),
				cell: ({ row }) => {
					const details = repoDetailsQueries.find(
						(q) => q.data?.fullName === row.original.fullName,
					)?.data;
					return <ActionsStatusCell repo={row.original} details={details} />;
				},
			},
			{
				accessorKey: "updatedAt",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Actividad
					</span>
				),
				cell: ({ row }) => <DateCell repo={row.original} />,
			},
			{
				accessorKey: "author",
				header: () => (
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Autor
					</span>
				),
				cell: ({ row }) => <AuthorCell repo={row.original} />,
			},
			{
				id: "operations",
				accessorKey: "actions",
				header: () => (
					<div className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Operations
					</div>
				),
				enableSorting: false,
				cell: ({ row }) => (
					<OperationsCell
						repo={row.original}
						isFavorite={favorites.includes(row.original.fullName)}
						onToggleFavorite={onToggleFavorite}
					/>
				),
			},
		],
		[favorites, onToggleFavorite, reposWithPending, repoDetailsQueries],
	);

	return (
		<Table
			columns={columns}
			data={sortedRepos}
			activeFilter={
				activeFilter ? { id: "pending_filter", value: activeFilter } : null
			}
		/>
	);
}

function RepoNameCell({ repo }: { repo: RepoInfo }) {
	const [org, name] = repo.fullName.split("/");
	const [isCommitsModalOpen, setIsCommitsModalOpen] = useState(false);

	const { data: queryData, isLoading } = useRepoDashboardDetails(repo.fullName);

	const commits = queryData?.commits;
	const latestTag = queryData?.latestTag;
	const pendingCount = queryData?.pendingCount || 0;

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
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									type="button"
									onClick={() => setIsCommitsModalOpen(true)}
									className="inline-flex items-center gap-1 text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full border border-warning/20 font-bold cursor-pointer hover:bg-warning/30 hover:border-warning/40 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
								>
									<GitPullRequestCreateArrow className="w-2.5 h-2.5" />
									<span>{pendingCount}</span>
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									className="bg-popover text-popover-foreground border px-2 py-1 rounded-md shadow-md text-[10px] font-bold uppercase tracking-wider z-50 animate-in fade-in zoom-in-95"
									sideOffset={5}
								>
									{pendingCount} commit{pendingCount !== 1 ? "s" : ""}{" "}
									pendientes de promoción
									<Tooltip.Arrow className="fill-popover" />
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
				)}
			</div>
			<CommitsModal
				isOpen={isCommitsModalOpen}
				onClose={() => setIsCommitsModalOpen(false)}
				commits={commits || []}
				prodCommitHash={latestTag?.commit || ""}
				prodTag={latestTag?.name}
			/>
		</>
	);
}

function TagCell({ repo }: { repo: RepoInfo }) {
	const [org, name] = repo.fullName.split("/");
	const { data: queryData, isLoading } = useRepoDashboardDetails(repo.fullName);
	const latestTag = queryData?.latestTag;
	const commits = queryData?.commits;
	const prodPipeline = usePipelineWithHealth({
		product: repo.fullName,
		enabled: !!latestTag?.commit && !!latestTag?.name,
	});
	const productionStatus = useMemo(
		() =>
			getPipelineStatusInfo(
				prodPipeline.data?.production?.events,
				prodPipeline.data?.production?.updatedAt,
			),
		[prodPipeline.data?.production],
	);
	const isProdLoading = prodPipeline.isLoading || isLoading;

	const tagCommitInfo = useMemo(() => {
		if (!latestTag?.commit || !commits) return undefined;
		const commit = (commits as Commit[]).find(
			(c) => c.hash === latestTag.commit,
		);
		if (!commit) return undefined;
		return {
			hash: commit.hash,
			shortHash: commit.shortHash,
			author: commit.author,
			date: commit.date,
			message: commit.message,
		};
	}, [latestTag, commits]);

	if (isLoading) {
		return <div className="h-4 bg-muted/20 rounded w-16 animate-pulse" />;
	}

	return latestTag?.name ? (
		<TagLink
			tagName={latestTag.name}
			org={org}
			repo={name}
			pipelineStatus={productionStatus}
			isLoading={isProdLoading}
			commitInfo={tagCommitInfo}
			navigateToRepo={true}
		/>
	) : (
		<span className="text-muted-foreground/40 text-xs font-medium italic">
			Sin tags
		</span>
	);
}

function CommitCell({ repo }: { repo: RepoInfo }) {
	const [org, name] = repo.fullName.split("/");
	const { data: queryData, isLoading } = useRepoDashboardDetails(repo.fullName);
	const latestCommit = queryData?.commits?.[0];
	const stagingPipeline = usePipelineWithHealth({
		product: repo.fullName,
		enabled: !!latestCommit?.hash,
	});
	const stagingStatus = useMemo(
		() =>
			getPipelineStatusInfo(
				stagingPipeline.data?.staging?.events,
				stagingPipeline.data?.staging?.updatedAt,
			),
		[stagingPipeline.data?.staging],
	);
	const isStagingLoading = stagingPipeline.isLoading || isLoading;

	const commitInfo = useMemo(() => {
		if (!latestCommit) return undefined;
		return {
			hash: latestCommit.hash,
			shortHash: latestCommit.shortHash,
			author: latestCommit.author,
			date: latestCommit.date,
			message: latestCommit.message,
		};
	}, [latestCommit]);

	if (isLoading) {
		return <div className="h-4 bg-muted/20 rounded w-16 animate-pulse" />;
	}

	return latestCommit?.shortHash ? (
		<CommitLink
			hash={latestCommit.shortHash}
			org={org}
			repo={name}
			pipelineStatus={stagingStatus}
			isLoading={isStagingLoading}
			commitInfo={commitInfo}
			navigateToRepo={true}
		/>
	) : (
		<span className="text-muted-foreground/40 text-xs font-medium italic">
			Sin commits
		</span>
	);
}

function DateCell({ repo }: { repo: RepoInfo }) {
	const { data: queryData, isLoading } = useRepoDashboardDetails(repo.fullName);
	const commitDate = queryData?.commits?.[0]?.date;

	if (isLoading) {
		return <div className="h-4 bg-muted/20 rounded w-24 animate-pulse" />;
	}

	return commitDate ? (
		<div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
			{DayJS(commitDate).fromNow()}
		</div>
	) : null;
}

function HealthCell({ repo }: { repo: RepoInfo }) {
	const { getEndpointsByProduct } = useHealthMonitor();
	const endpoints = getEndpointsByProduct(repo.fullName);

	if (endpoints.length === 0) return null;

	const healthyCount = endpoints.filter((e) => e.isHealthy === true).length;
	const unhealthyCount = endpoints.filter((e) => e.isHealthy === false).length;
	const pendingCount = endpoints.filter((e) => e.isHealthy === null).length;

	const statusLabel = unhealthyCount > 0 ? "ERROR" : "OK";

	return (
		<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<Link
						to="/health"
						search={{
							environment: unhealthyCount > 0 ? "unhealthy" : undefined,
						}}
						className="flex items-center gap-1.5 hover:bg-muted/40 p-1 rounded-md transition-colors"
					>
						<div className="flex items-center -space-x-1">
							{unhealthyCount > 0 && (
								<div className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
							)}
							{healthyCount > 0 && (
								<div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
							)}
							{pendingCount > 0 && (
								<div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shadow-sm" />
							)}
						</div>
						<div className="flex items-center gap-1.5">
							<span
								className={clsx(
									"text-[10px] font-bold uppercase tracking-wider",
									unhealthyCount > 0 ? "text-destructive" : "text-success",
								)}
							>
								{statusLabel}
							</span>
							<span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">
								({endpoints.length})
							</span>
						</div>
					</Link>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-2 py-1 rounded-md shadow-md text-[10px] font-bold uppercase tracking-wider z-50 animate-in fade-in zoom-in-95"
						sideOffset={5}
					>
						<div className="space-y-1">
							<p className="border-b border-border/40 pb-1 mb-1">
								Estado de Salud
							</p>
							{healthyCount > 0 && (
								<p className="text-success flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-success" />{" "}
									{healthyCount} OK
								</p>
							)}
							{unhealthyCount > 0 && (
								<p className="text-destructive flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-destructive" />{" "}
									{unhealthyCount} Error
								</p>
							)}
							{pendingCount > 0 && (
								<p className="text-muted-foreground flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />{" "}
									{pendingCount} Pendiente
								</p>
							)}
						</div>
						<Tooltip.Arrow className="fill-popover" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
	);
}

function AuthorCell({ repo }: { repo: RepoInfo }) {
	const { data: queryData, isLoading } = useRepoDashboardDetails(repo.fullName);
	const commitAuthor = queryData?.commits?.[0]?.author;

	if (isLoading) {
		return <div className="h-4 bg-muted/20 rounded w-32 animate-pulse" />;
	}

	const truncatedAuthor =
		commitAuthor && commitAuthor.length > 25
			? `${commitAuthor.slice(0, 25)}...`
			: commitAuthor;

	return truncatedAuthor ? (
		<span
			className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60"
			title={commitAuthor}
		>
			{truncatedAuthor}
		</span>
	) : null;
}

function PRsCell({ repo, details }: { repo: RepoInfo; details?: RepoDetails }) {
	const prCount = details?.prCount || 0;

	if (!details) {
		return <div className="h-4 bg-muted/20 rounded w-8 animate-pulse" />;
	}

	if (prCount === 0) return null;

	const [org, name] = repo.fullName.split("/");

	return (
		<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<a
						href={`https://github.com/${org}/${name}/pulls`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/20 text-primary border border-primary/20 rounded-md hover:bg-primary/30 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						aria-label={`${prCount} pull requests abiertos`}
					>
						<GitPullRequest className="w-3 h-3" />
						<span className="text-[10px] font-bold uppercase tracking-wider">
							{prCount}
						</span>
					</a>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-2 py-1 rounded-md shadow-md text-[10px] font-bold uppercase tracking-wider z-50 animate-in fade-in zoom-in-95"
						sideOffset={5}
					>
						{prCount} pull request{prCount !== 1 ? "s" : ""} abierto
						<Tooltip.Arrow className="fill-popover" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
	);
}

function ActionsStatusCell({
	repo,
	details,
}: {
	repo: RepoInfo;
	details?: RepoDetails;
}) {
	const actions = details?.actions;

	if (!details) {
		return <div className="h-4 bg-muted/20 rounded w-12 animate-pulse" />;
	}

	if (!actions || actions.total === 0) return null;

	const [org, name] = repo.fullName.split("/");
	const hasFailure = actions.failed > 0;
	const isRunning = actions.running > 0;

	return (
		<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<a
						href={`https://github.com/${org}/${name}/actions`}
						target="_blank"
						rel="noopener noreferrer"
						className={clsx(
							"inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 border",
							hasFailure
								? "bg-destructive/20 text-destructive border-destructive/20 hover:bg-destructive/30"
								: isRunning
									? "bg-warning/20 text-warning border-warning/20 hover:bg-warning/30"
									: "bg-success/20 text-success border-success/20 hover:bg-success/30",
						)}
						aria-label={`Estado de GitHub Actions: ${hasFailure ? "Fallido" : isRunning ? "En progreso" : "Exitoso"}`}
					>
						<Play className={clsx("w-3 h-3", isRunning && "animate-pulse")} />
						<span className="text-[10px] font-bold uppercase tracking-wider">
							{hasFailure ? "Error" : isRunning ? "Running" : "Success"}
						</span>
					</a>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-2 py-1 rounded-md shadow-md text-[10px] font-bold uppercase tracking-wider z-50 animate-in fade-in zoom-in-95"
						sideOffset={5}
					>
						<div className="space-y-1">
							<p className="border-b border-border/40 pb-1 mb-1">
								Últimos 5 runs
							</p>
							{actions.failed > 0 && (
								<p className="text-destructive flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-destructive" />{" "}
									{actions.failed} Fallidos
								</p>
							)}
							{actions.running > 0 && (
								<p className="text-warning flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />{" "}
									{actions.running} En curso
								</p>
							)}
							{actions.total - actions.failed - actions.running > 0 && (
								<p className="text-success flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-success" />
									{actions.total - actions.failed - actions.running} Exitosos
								</p>
							)}
						</div>
						<Tooltip.Arrow className="fill-popover" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
	);
}

function OperationsCell({
	repo,
	isFavorite,
	onToggleFavorite,
}: {
	repo: RepoInfo;
	isFavorite: boolean;
	onToggleFavorite: (product: string) => void;
}) {
	const [org, name] = repo.fullName.split("/");
	const [isProjectSelectionOpen, setIsProjectSelectionOpen] = useState(false);
	const { data: queryData } = useRepoDashboardDetails(repo.fullName);
	const latestTag = queryData?.latestTag;

	return (
		<div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
			<FreezeDialog repo={repo.fullName} iconOnly={true} />
			<ForceRedeployDialog repo={repo.fullName} iconOnly={true} />
			<PromoteDialog
				repo={repo.fullName}
				latestTag={latestTag?.name}
				iconOnly={true}
			/>
			<div className="w-px h-4 bg-border/20 mx-0.5" />
			<ActionButton
				action={ACTION_DEFINITIONS.manageProjects}
				onClick={() => setIsProjectSelectionOpen(true)}
				size="sm"
			/>
			<ActionButton
				action={ACTION_DEFINITIONS.openGitHub}
				onClick={() =>
					window.open(`https://github.com/${org}/${name}`, "_blank")
				}
				size="sm"
			/>
			<ActionButton
				action={
					isFavorite
						? ACTION_DEFINITIONS.removeFavorite
						: ACTION_DEFINITIONS.addFavorite
				}
				onClick={() => onToggleFavorite(repo.fullName)}
				size="sm"
			/>
			<ItemProjectSelectionDialog
				isOpen={isProjectSelectionOpen}
				onOpenChange={setIsProjectSelectionOpen}
				type="repo"
				itemId={repo.fullName}
			/>
		</div>
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
