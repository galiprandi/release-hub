import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import { useQueryClient } from "@tanstack/react-query";
import { PipelineMonitor } from "@/components/PipelineMonitor/PipelineMonitor";
import { StageCommitsTable } from "@/components/StageCommitsTable";
import { PromoteDialog } from "@/components/PromoteDialog";
import { ForceRedeployDialog } from "@/components/ForceRedeployDialog";
import { FreezeDialog } from "@/components/FreezeDialog";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { ProjectSelector } from "@/components/ProjectSelector";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTags } from "@/hooks/useGitTags";
import { usePipelineDetector } from "@/hooks/usePipelineDetector";
import { usePipelineWithHealth } from "@/hooks/usePipelineWithHealth";
import { useOpenPullRequests } from "@/hooks/useOpenPullRequests";
import { useGitHubActionsSummary } from "@/hooks/useGitHubActionsSummary";
import { GitPullRequest, Play } from "lucide-react";
import { K8sSection } from "@/components/K8sSection";

dayjs.extend(relativeTime);
dayjs.locale("es");

export const Route = createFileRoute("/product/$org/$product/")({
	component: ProductIndex,
});

function ProductIndex() {
	const { org, product } = Route.useParams();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();
	const queryClient = useQueryClient();
	const viewMode = search.view || "commits";
	const fullProduct = `${org}/${product}`;
	const isCommits = viewMode === "commits";

	const { latestCommit } = useGitCommits({ repo: fullProduct });
	const { latestTag } = useGitTags({ repo: fullProduct });
	const { data: openPRs } = useOpenPullRequests(fullProduct);
	const { data: actionsSummary } = useGitHubActionsSummary(fullProduct);

	// Detect pipeline type
	const { plugin: detectedPlugin } = usePipelineDetector({
		org,
		repo: product,
	});

	const isSeki = detectedPlugin === "seki";

	const commitsPipeline = usePipelineWithHealth({
		product: fullProduct,
		commit: latestCommit?.hash ?? "",
		enabled: isSeki && isCommits && !!latestCommit?.hash,
	});

	const tagsPipeline = usePipelineWithHealth({
		product: fullProduct,
		commit: latestTag?.commit ?? "",
		tag: latestTag?.name ?? "",
		enabled: isSeki && !isCommits && !!latestTag?.commit && !!latestTag?.name,
	});

	const pipeline = isCommits ? commitsPipeline.data : tagsPipeline.data;
	const isPipelineLoading = isCommits ? commitsPipeline.isLoading : tagsPipeline.isLoading;
	const isPipelineFetching = isCommits ? commitsPipeline.isFetching : tagsPipeline.isFetching;
	const dataUpdatedAt = isCommits ? commitsPipeline.dataUpdatedAt : tagsPipeline.dataUpdatedAt;
	const currentPipeline = isCommits ? commitsPipeline : tagsPipeline;

	const handleRefetchPipeline = () => {
		currentPipeline.refetch();
	};

	// Usar fecha del commit/tag para consistencia con la tabla
	const gitDate = isCommits ? latestCommit?.date : latestTag?.date;

	return (
		<div>
			<div className="flex justify-between items-center gap-4 px-4 mb-2">
				<RefetchButton
					onRefetch={() => {
						// Invalida todas las queries relacionadas con este repo
						queryClient.invalidateQueries({ queryKey: ["git", "commits", fullProduct] });
						queryClient.invalidateQueries({ queryKey: ["git", "tags", fullProduct] });
						queryClient.invalidateQueries({ queryKey: ["pipeline", fullProduct] });
					}}
					isRefetching={isPipelineFetching}
					showFeedback={true}
					targetTime={dataUpdatedAt}
				/>
			</div>

			<div className="space-y-2 mb-6">
				<PipelineMonitor
					org={org}
					repo={product}
					sekiData={{
						pipeline,
						viewMode,
						gitDate,
						isLoading: isPipelineLoading || isPipelineFetching,
						refetch: handleRefetchPipeline,
						tagName: latestTag?.name,
					}}
				/>
			</div>

			<div className="space-y-2 mb-6">
				<K8sSection namespace={product} />
			</div>

			{/* Tabs de navegación */}
			<div className="flex border-b border-border mb-3">
				<button
					type="button"
					onClick={() => navigate({ search: { view: "commits" } })}
					className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
						viewMode === "commits"
							? "text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Commits
					{viewMode === "commits" && (
						<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
					)}
				</button>
				<button
					type="button"
					onClick={() => navigate({ search: { view: "tags" } })}
					className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
						viewMode === "tags"
							? "text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Tags
					{viewMode === "tags" && (
						<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
					)}
				</button>
			</div>

			{/* Toolbar de acciones */}
			<div className="flex items-center gap-2 mb-4 flex-wrap">
				{/* Links externos */}
				<a
					href={openPRs?.repoUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
				>
					<GitPullRequest className="w-4 h-4" />
					<span>Pull Requests</span>
					{openPRs && openPRs.count > 0 && (
						<span className="inline-flex items-center justify-center px-1.5 py-0 text-[10px] font-bold bg-primary/10 text-primary rounded-full min-w-[1.25rem] h-4">
							{openPRs.count}
						</span>
					)}
				</a>
				<a
					href={actionsSummary?.repoUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
				>
					<Play className="w-4 h-4" />
					<span>Actions</span>
					{actionsSummary && actionsSummary.total > 0 && (
						<div className="flex items-center gap-1 ml-0.5">
							{actionsSummary.running > 0 && (
								<span className="inline-flex items-center gap-0.5 px-1.5 py-0 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full h-4">
									<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
									{actionsSummary.running}
								</span>
							)}
							{actionsSummary.failed > 0 && (
								<span className="inline-flex items-center justify-center px-1.5 py-0 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-full min-w-[1rem] h-4">
									{actionsSummary.failed}
								</span>
							)}
						</div>
					)}
				</a>

				{/* Separador flexible que empuja todo a la derecha */}
				<div className="flex-1 min-w-4" />

				<div className="flex items-center gap-3">
					{/* Configuración */}
					<ProjectSelector repo={fullProduct} />

					<div className="w-px h-5 bg-border mx-1" />

					{/* Operaciones */}
					<div className="flex items-center gap-2">
						<FreezeDialog repo={fullProduct} iconOnly={false} />
						{isCommits ? (
							<ForceRedeployDialog repo={fullProduct} />
						) : (
							<PromoteDialog repo={fullProduct} latestTag={latestTag?.name} />
						)}
					</div>
				</div>
			</div>

			<StageCommitsTable
				viewMode={viewMode}
				org={org}
				product={product}
				showStatus={false}
			/>
		</div>
	);
}
