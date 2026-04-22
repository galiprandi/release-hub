import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SekiMonitor } from "@/components/SekiMonitor/SekiMonitor";
import { StageCommitsTable } from "@/components/StageCommitsTable";
import { CreateTagDialog } from "@/components/CreateTagDialog";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTags } from "@/hooks/useGitTags";
import { usePipeline, usePipelineWithTag } from "@/hooks/usePipeline";
import { useToken } from "@/hooks/useToken";
import { useRepoPermission } from "@/hooks/useUserRepos";

export const Route = createFileRoute("/product/$org/$product/")({
	component: ProductIndex,
});

function ProductIndex() {
	const { org, product } = Route.useParams();
	const [activeStage, setActiveStage] = useState<"staging" | "production">(
		"staging",
	);
	const [tokenInput, setTokenInput] = useState("");
	const { saveToken, clearToken, isExpired, needsToken, expirationDate } = useToken();
	const fullProduct = `${org}/${product}`;
	const isStaging = activeStage === "staging";
	const queryClient = useQueryClient();

	const { latestCommit } = useGitCommits({ repo: fullProduct });
	const { latestTag } = useGitTags({ repo: fullProduct });
	const { data: repoPermission, isLoading: isLoadingPermissions } = useRepoPermission(fullProduct);

	const canCreateTags =
		repoPermission?.permissions?.push ||
		repoPermission?.permissions?.maintain ||
		repoPermission?.permissions?.admin ||
		repoPermission?.viewerPermission === 'WRITE' ||
		repoPermission?.viewerPermission === 'ADMIN' ||
		repoPermission?.viewerCanAdminister;

	const stagingPipeline = usePipeline({
		product: fullProduct,
		commit: latestCommit?.hash ?? "",
		enabled: isStaging && !!latestCommit?.hash,
	});

	const prodPipeline = usePipelineWithTag({
		product: fullProduct,
		commit: latestCommit?.hash ?? "",
		tag: latestTag?.name ?? "",
		enabled: !isStaging && !!latestCommit?.hash && !!latestTag?.name,
	});

	const pipeline = isStaging ? stagingPipeline.data : prodPipeline.data;
	const isPipelineLoading = isStaging ? stagingPipeline.isLoading : prodPipeline.isLoading;
	const isPipelineFetching = isStaging ? stagingPipeline.isFetching : prodPipeline.isFetching;

	// Usar fecha del commit/tag para consistencia con la tabla
	const gitDate = isStaging ? latestCommit?.date : latestTag?.date;

	const handleSaveToken = () => {
		if (tokenInput.trim()) {
			saveToken(tokenInput.trim());
			setTokenInput("");
		}
	};

	return (
		<div>
			{needsToken || isExpired ? (
				<div className="mb-8 rounded-xl border border-dashed p-6 space-y-3">
					<p className="text-sm text-muted-foreground">
						{isExpired
							? "Your API token has expired. Please enter a new token."
							: "No API token configured. Please enter your Seki API token to view pipeline data."}
					</p>
					{expirationDate && (
						<p className="text-xs text-muted-foreground">
							{expirationDate}
						</p>
					)}
					<div className="flex gap-2">
						<input
							type="text"
							value={tokenInput}
							onChange={(e) => setTokenInput(e.target.value)}
							placeholder="Enter your JWT token"
							className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<button
							type="button"
							onClick={handleSaveToken}
							className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
						>
							Save Token
						</button>
					</div>
				</div>
			) : (
				<>
					{isPipelineLoading || isPipelineFetching ? (
						<div className="mb-8 rounded-xl border border-dashed p-6 flex items-center justify-center">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Loading pipeline data...
							</div>
						</div>
					) : (
						<div className="space-y-4 mb-10">
							<SekiMonitor pipeline={pipeline} stage={activeStage} gitDate={gitDate} />
							<div className="flex justify-end items-center gap-2">
								{expirationDate && (
									<p className="text-xs text-muted-foreground">
										{expirationDate} •
									</p>
								)}
								<button
									type="button"
									onClick={clearToken}
									className="text-xs text-red-600 hover:text-red-700 hover:underline"
								>
									Revoke now
								</button>
							</div>
						</div>
					)}
					{/* Environment Selector - Pill Style */}
					<div className="flex bg-muted rounded-lg p-1 mb-4 items-center justify-between">
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setActiveStage("staging")}
								className={`px-4 py-1.5 text-sm rounded-md transition-all ${
									activeStage === "staging"
										? "bg-white shadow-sm text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Commits
							</button>
							<button
								type="button"
								onClick={() => setActiveStage("production")}
								className={`px-4 py-1.5 text-sm rounded-md transition-all ${
									activeStage === "production"
										? "bg-white shadow-sm text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Tags
							</button>
						</div>
						{activeStage === "production" && (
							<CreateTagDialog
								latestTag={latestTag?.name}
								repo={fullProduct}
								product={fullProduct}
								commit={latestCommit?.hash}
								canCreateTags={canCreateTags}
								isLoadingPermissions={isLoadingPermissions}
								onSuccess={() => {
									// Invalidate queries after creating a new one
									queryClient.invalidateQueries({ queryKey: ['git', 'tags', fullProduct] });
									queryClient.invalidateQueries({ queryKey: ['repo', 'permission', fullProduct] });
									// Keep active stage as production
									setActiveStage('production');
								}}
							/>
						)}
					</div>
					<StageCommitsTable
						stage={activeStage}
						org={org}
						product={product}
						limit={10}
					/>
				</>
			)}
		</div>
	);
}
