import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTags } from "@/hooks/useGitTags";
import { usePipeline, usePipelineWithTag } from "@/hooks/usePipeline";
import { useToken } from "@/hooks/useToken";
import { usePipelineDetector } from "@/hooks/usePipelineDetector";

dayjs.extend(relativeTime);
dayjs.locale("es");

export const Route = createFileRoute("/product/$org/$product/")({
	component: ProductIndex,
});

function ProductIndex() {
	const { org, product } = Route.useParams();
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useState<"commits" | "tags">("commits");
	const [tokenInput, setTokenInput] = useState("");
	const { saveToken, clearToken, isExpired, needsToken, expirationDate } = useToken();
	const fullProduct = `${org}/${product}`;
	const isCommits = viewMode === "commits";

	const { latestCommit } = useGitCommits({ repo: fullProduct });
	const { latestTag } = useGitTags({ repo: fullProduct });

	// Detect pipeline type
	const { plugin: detectedPlugin } = usePipelineDetector({
		org,
		repo: product,
	});

	const isSeki = detectedPlugin === "seki";

	const commitsPipeline = usePipeline({
		product: fullProduct,
		commit: latestCommit?.hash ?? "",
		enabled: isSeki && isCommits && !!latestCommit?.hash,
	});

	const tagsPipeline = usePipelineWithTag({
		product: fullProduct,
		commit: latestCommit?.hash ?? "",
		tag: latestTag?.name ?? "",
		enabled: isSeki && !isCommits && !!latestCommit?.hash && !!latestTag?.name,
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

	const handleSaveToken = () => {
		if (tokenInput.trim()) {
			// Remove "Bearer " or "bearer " prefix if present
			const cleanToken = tokenInput.trim().replace(/^(Bearer|bearer)\s+/, "");
			saveToken(cleanToken);
			setTokenInput("");
		}
	};

	return (
		<div>
			{needsToken || isExpired ? (
				<div className="mb-8 rounded-xl border border-dashed p-6 space-y-3">
					<p className="text-sm text-muted-foreground">
						{isExpired
							? "Token de API expirado. Se requiere el ingreso de un nuevo token para continuar."
							: "Sin token de API configurado. El ingreso del token de API de Seki es necesario para visualizar los datos del Pipeline."}
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
							placeholder="Ingreso de token JWT"
							className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<button
							type="button"
							onClick={handleSaveToken}
							className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
						>
							Guardar token
						</button>
					</div>
				</div>
			) : (
				<>
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
						<div className="flex items-center gap-2">
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
								Revocar acceso
							</button>
						</div>
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
					{/* Environment Selector - Pill Style */}
					<div className="flex bg-muted rounded-lg p-1 mb-4 items-center justify-between">
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setViewMode("commits")}
								className={`px-4 py-1.5 text-sm rounded-md transition-all ${
									viewMode === "commits"
										? "bg-white shadow-sm text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Commits
							</button>
							<button
								type="button"
								onClick={() => setViewMode("tags")}
								className={`px-4 py-1.5 text-sm rounded-md transition-all ${
									viewMode === "tags"
										? "bg-white shadow-sm text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Tags
							</button>
						</div>
						<div className="flex items-center gap-2">
							<FreezeDialog repo={fullProduct} iconOnly={false} />
							{isCommits ? (
								<ForceRedeployDialog repo={fullProduct} />
							) : (
								<PromoteDialog repo={fullProduct} latestTag={latestTag?.name} />
							)}
						</div>
					</div>
					<StageCommitsTable
						viewMode={viewMode}
						org={org}
						product={product}
						showStatus={false}
					/>
				</>
			)}
		</div>
	);
}
