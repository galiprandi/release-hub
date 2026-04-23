import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import { SekiMonitor } from "@/components/SekiMonitor/SekiMonitor";
import { StageCommitsTable } from "@/components/StageCommitsTable";
import { PromoteDialog } from "@/components/PromoteDialog";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTags } from "@/hooks/useGitTags";
import { usePipeline, usePipelineWithTag } from "@/hooks/usePipeline";
import { useToken } from "@/hooks/useToken";

dayjs.extend(relativeTime);
dayjs.locale("es");

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

	const { latestCommit } = useGitCommits({ repo: fullProduct });
	const { latestTag } = useGitTags({ repo: fullProduct });


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
	const currentPipeline = isStaging ? stagingPipeline : prodPipeline;
	const dataUpdatedAt = isStaging ? stagingPipeline.dataUpdatedAt : prodPipeline.dataUpdatedAt;

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
					{isPipelineLoading || isPipelineFetching ? (
						<div className="mb-8 rounded-xl border border-dashed p-6 flex items-center justify-center">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Cargando información del Pipeline...
							</div>
						</div>
					) : (
						<div className="space-y-2 mb-10">
							<div className="flex justify-between items-center gap-4 px-4">
								<RefetchButton
									onRefetch={() => currentPipeline.refetch()}
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
							<SekiMonitor pipeline={pipeline} stage={activeStage} gitDate={gitDate} />
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
						<div className="flex items-center gap-2">
							<PromoteDialog
								repo={fullProduct}
								latestTag={latestTag?.name}
							/>
						</div>
					</div>
					<StageCommitsTable
						stage={activeStage}
						org={org}
						product={product}
						showStatus={false}
					/>
				</>
			)}
		</div>
	);
}
