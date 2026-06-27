import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import { UnifiedPipelineMonitor } from "@/pipeline-core/components/UnifiedPipelineMonitor";
import { StageCommitsTable } from "@/github/components/StageCommitsTable";
import { PromoteDialog } from "@/github/components/PromoteDialog";
import { ForceRedeployDialog } from "@/github/components/ForceRedeployDialog";
import { FreezeDialog } from "@/github/components/FreezeDialog";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTags } from "@/hooks/useGitTags";
import { useOpenPullRequests } from "@/hooks/useOpenPullRequests";
import { useGitHubActionsSummary } from "@/hooks/useGitHubActionsSummary";
import { GitPullRequest, Play, GitCommit, Tag } from "lucide-react";
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
	const isCommits = viewMode === "commits";

	const { latestCommit, refetch: refreshCommits } = useGitCommits({ repo: fullProduct });
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

	const monitorRef = isCommits ? (latestCommit?.hash ?? "") : (latestTag?.name ?? "");

	return (
		<PageLayout
			header={{
				title: fullProduct,
				searchComponent: (
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
								Vista:
							</span>
							<IndustrialTabs
								activeId={viewMode}
								onChange={(val) =>
									navigate({ search: { view: val as "commits" | "tags" } })
								}
								options={[
									{
										id: "commits",
										label: (
											<div className="flex items-center gap-1.5">
												<GitCommit className="w-3 h-3" />
												<span>Commits</span>
											</div>
										),
									},
									{
										id: "tags",
										label: (
											<div className="flex items-center gap-1.5">
												<Tag className="w-3 h-3" />
												<span>Tags</span>
											</div>
										),
									},
								]}
								className="w-48"
							/>
						</div>
						<div className="w-px h-6 bg-border/40 mx-1" />
						<div className="flex items-center gap-2">
							<a
								href={openPRs?.repoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/40 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
							>
								<GitPullRequest className="w-3.5 h-3.5 text-primary/60" />
								<span>PRs</span>
								{openPRs && openPRs.count > 0 && (
									<span className="inline-flex items-center justify-center px-1.5 py-0 text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 rounded-full min-w-[1.25rem] h-4">
										{openPRs.count}
									</span>
								)}
							</a>
							<a
								href={actionsSummary?.repoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/40 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
							>
								<Play className="w-3.5 h-3.5 text-primary/60" />
								<span>Actions</span>
								{actionsSummary && actionsSummary.total > 0 && (
									<div className="flex items-center gap-1 ml-0.5">
										{actionsSummary.running > 0 && (
											<span className="inline-flex items-center gap-0.5 px-1.5 py-0 text-[10px] font-bold bg-warning/20 text-warning border border-warning/20 rounded-full h-4">
												<span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
												{actionsSummary.running}
											</span>
										)}
										{actionsSummary.failed > 0 && (
											<span className="inline-flex items-center justify-center px-1.5 py-0 text-[10px] font-bold bg-destructive/20 text-destructive border border-destructive/20 rounded-full min-w-[1rem] h-4">
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
				<FreezeDialog key="freeze" repo={fullProduct} iconOnly={true} showLabel={true} />,
				isCommits ? (
					<ForceRedeployDialog key="redeploy" repo={fullProduct} iconOnly={true} showLabel={true} />
				) : (
					<PromoteDialog key="promote" repo={fullProduct} latestTag={latestTag?.name} iconOnly={true} showLabel={true} />
				),
				<div key="divider" className="w-px h-6 bg-border/40 mx-1" />,
				<ProjectSelector key="project" repo={fullProduct} />,
			]}
			refreshFn={handleRefetchPipeline}
		>
			<div className="space-y-4 mb-4">
				<UnifiedPipelineMonitor
					org={org}
					repo={repo}
					viewMode={viewMode}
					ref={monitorRef}
					commit={!isCommits ? latestTag?.commit : undefined}
				/>
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
