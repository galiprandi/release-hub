import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import { SekiPipelineMonitor } from "@/plugins/pipeline/seki/components";
import { PulsarBuildMonitor } from "@/plugins/pipeline/pulsar/components";
import { StageCommitsTable } from "@/github/components/StageCommitsTable";
import { PromoteDialog } from "@/github/components/PromoteDialog";
import { ForceRedeployDialog } from "@/github/components/ForceRedeployDialog";
import { FreezeDialog } from "@/github/components/FreezeDialog";
import { useSekiPipelinesByEnv } from "@/plugins/pipeline/seki/hooks/useSekiPipelinesByEnv";
import { usePulsarBuilds } from "@/plugins/pipeline/pulsar/hooks/usePulsarBuilds";
import { pulsarAdapter } from "@/plugins/pipeline/pulsar/adapter";
import { ProjectSelector } from "@/github/components/ProjectSelector";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTags } from "@/hooks/useGitTags";
import { useOpenPullRequests } from "@/hooks/useOpenPullRequests";
import { useGitHubActionsSummary } from "@/hooks/useGitHubActionsSummary";
import { GitPullRequest, Play, GitCommit, Tag, Info } from "lucide-react";
import { PageLayout } from "@/layouts/PageLayout";
import { IndustrialTabs } from "@/components/shared/IndustrialTabs";

dayjs.extend(relativeTime);
dayjs.locale("es");

export const Route = createFileRoute("/github/$org/$repo")({
	component: ProductIndex,
	validateSearch: (search: Record<string, unknown>) => ({
		view: (search.view === "tags" ? "tags" : "commits") as "commits" | "tags",
	}),
	notFoundComponent: () => <div>Repository not found</div>,
});

function ProductIndex() {
	const { org, repo } = Route.useParams();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();
	const viewMode = search.view || "commits";
	const fullProduct = `${org}/${repo}`;

	const { refetch: refreshCommits } = useGitCommits({ repo: fullProduct });
	const { latestTag, refetch: refreshTags } = useGitTags({ repo: fullProduct });
	const { data: openPRs, refetch: refreshOpenPRs } = useOpenPullRequests(fullProduct);
	const { data: actionsSummary, refetch: refreshActionsSummary } = useGitHubActionsSummary(fullProduct);

	const handleRefetchPipeline = () => {
		Promise.all([
			refreshCommits(),
			refreshTags(),
			refreshOpenPRs(),
			refreshActionsSummary(),
		]);
	};

	return (
		<PageLayout
			header={{
				title: fullProduct,
				searchComponent: (
					<div className="flex items-center gap-3">
						<IndustrialTabs
							activeId={viewMode}
							onChange={(val) =>
								navigate({ search: { view: val as "commits" | "tags" } })
							}
							options={[
								{
									id: "tags",
									label: (
										<div className="flex items-center gap-1.5">
											<Tag className="w-3.5 h-3.5" />
											<span>Tags</span>
										</div>
									),
								},
								{
									id: "commits",
									label: (
										<div className="flex items-center gap-1.5">
											<GitCommit className="w-3.5 h-3.5" />
											<span>Commits</span>
										</div>
									),
								},
							]}
							className="w-44"
						/>
						<div className="w-px h-5 bg-border" />
						<div className="flex items-center gap-2">
							<a
								href={openPRs?.repoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/30 border border-border rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary/30"
							>
								<GitPullRequest className="w-3.5 h-3.5 text-primary" />
								<span>PRs</span>
								{openPRs && openPRs.count > 0 && (
									<span className="inline-flex items-center justify-center px-1.5 py-0 text-xs font-semibold bg-primary/15 text-primary border border-primary/30 rounded-full h-4 min-w-[1.25rem]">
										{openPRs.count}
									</span>
								)}
							</a>
							<a
								href={actionsSummary?.repoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/30 border border-border rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary/30"
							>
								<Play className="w-3.5 h-3.5 text-primary" />
								<span>Actions</span>
								{actionsSummary && actionsSummary.total > 0 && (
									<div className="flex items-center gap-1 ml-0.5">
										{actionsSummary.running > 0 && (
											<span className="inline-flex items-center gap-0.5 px-1.5 py-0 text-xs font-semibold bg-warning/15 text-warning border border-warning/30 rounded-full h-4">
												<span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
												{actionsSummary.running}
											</span>
										)}
										{actionsSummary.failed > 0 && (
											<span className="inline-flex items-center justify-center px-1.5 py-0 text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/40 rounded-full min-w-[1rem] h-4">
												{actionsSummary.failed}
											</span>
										)}
									</div>
								)}
							</a>
						</div>
					</div>
				),
			}}
			actions={[
				<PromoteDialog
					key="promote"
					repo={fullProduct}
					latestTag={latestTag?.name}
					iconOnly={false}
				/>,
				<ForceRedeployDialog
					key="redeploy"
					repo={fullProduct}
					iconOnly={true}
					showLabel={true}
				/>,
				<FreezeDialog
					key="freeze"
					repo={fullProduct}
					iconOnly={true}
					showLabel={true}
				/>,
				<div key="divider" className="w-px h-5 bg-border mx-1" />,
				<ProjectSelector key="project" repo={fullProduct} />,
			]}
			refreshFn={handleRefetchPipeline}
		>
			<div className="space-y-4 mb-4">
				<PulsarBuildMonitor
					org={org}
					repo={repo}
				/>
				<SekiPipelineMonitor
					org={org}
					repo={repo}
				/>
				<NoPipelineDataHint org={org} repo={repo} />
			</div>

			<div className="mt-2">
				<StageCommitsTable
					viewMode={viewMode}
					org={org}
					product={repo}
					showStatus={false}
				/>
			</div>
		</PageLayout>
	);
}

function NoPipelineDataHint({ org, repo }: { org: string; repo: string }) {
	const { data: sekiData, isLoading: sekiLoading } = useSekiPipelinesByEnv({ org, repo })
	const { data: isPulsar } = useQuery({
		queryKey: ['pulsar-detection', org, repo],
		queryFn: () => pulsarAdapter.isPulsarRepo(org, repo),
		staleTime: 5 * 60 * 1000,
	})
	const { data: pulsarData, isLoading: pulsarLoading } = usePulsarBuilds({ org, repo, enabled: !!isPulsar })

	// Only show hint when all data has loaded and there's nothing
	if (sekiLoading || pulsarLoading) return null
	if (sekiData || pulsarData) return null

	return (
		<div className="flex items-start gap-3 p-4 rounded-md border border-border bg-card">
			<Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
			<div className="space-y-1">
				<p className="text-sm font-medium">No pipeline data detected</p>
				<p className="text-xs text-muted-foreground">
					This repository doesn't have Seki or Pulsar pipelines configured.
					You can still promote tags and manage branches using the actions above.
				</p>
			</div>
		</div>
	)
}
