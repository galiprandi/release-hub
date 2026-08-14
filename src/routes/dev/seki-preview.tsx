/**
 * Ruta /dev/seki-preview — Sandbox de iteración visual para SekiPipelineMonitor
 *
 * ESTA RUTA NO DEBE SER BORRADA.
 *
 * Propósito: servir como entorno de diseño y iteración rápida para el componente
 * productivo SekiPipelineMonitor sin depender de la API real de Seki. Carga un
 * mock JSON crudo (formato API Seki) y lo pasa por el adapter productivo.
 *
 * Componentes involucrados:
 * - SekiPipelineMonitorData → src/plugins/pipeline/seki/components/SekiPipelineMonitor.tsx
 * - transformSekiData        → src/plugins/pipeline/seki/adapter.ts
 * - CommitLink / TagLink     → src/github/components/ (monitor reducido del dashboard)
 * - DeployStatusIndicator    → src/components/ui/DeployStatusIndicator.tsx
 * - Mock JSON               → src/plugins/pipeline/seki/dev/sek.mock.json
 *
 * Mejoras futuras conocidas:
 * - Probar con data real del endpoint de Seki (no mock)
 * - Validar el fallback regex con logs reales (extractFallback)
 * - Mover los labels de stages a una sola palabra en la API real
 * - Considerar colapsar stages OK por defecto y expandir sólo el fallido
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SekiPipelineMonitorData } from "@/plugins/pipeline/seki/components";
import { transformSekiData } from "@/plugins/pipeline/seki/adapter";
import type { SekiPipelinesByEnv } from "@/plugins/pipeline/seki/adapter";
import type { PipelineStatusResponse } from "@/api/seki.type";
import type { SekiPipelineEvent, SekiPipelineData } from "@/plugins/pipeline/seki/types";
import { getPipelineStatusInfo } from "@/plugins/pipeline/seki/utils";
import { CommitLink } from "@/github/components/CommitLink";
import { TagLink } from "@/github/components/TagLink";
import { PageLayout } from "@/layouts/PageLayout";
import mockRaw from "@/plugins/pipeline/seki/dev/sek.mock.json";
import { failedDeployMock } from "@/plugins/pipeline/seki/dev/failedDeployMock";

export const Route = createFileRoute("/dev/seki-preview")({
	component: SekiPreviewPage,
});

const mockData: SekiPipelinesByEnv = {
	staging: mockRaw.staging ? transformSekiData(mockRaw.staging as PipelineStatusResponse) : null,
	production: mockRaw.production ? transformSekiData(mockRaw.production as PipelineStatusResponse) : null,
};

/** Convierte stages → events preservando subevents para getPipelineStatusInfo */
function stagesToEvents(data: SekiPipelineData): SekiPipelineEvent[] {
	return (data.stages || []).map((stage) => ({
		id: stage.id,
		name: stage.label,
		label: stage.label,
		state: stage.state,
		startedAt: stage.startedAt,
		completedAt: stage.completedAt,
		subevents: stage.subevents,
	}))
}

function SekiPreviewPage() {
	const [scenario, setScenario] = useState<"normal" | "failed">("normal");
	const activeData = scenario === "failed" ? failedDeployMock : mockData;

	const stagingStatus = getPipelineStatusInfo(
		mockData.staging ? stagesToEvents(mockData.staging) : undefined,
		mockData.staging?.updatedAt,
	);
	const productionStatus = getPipelineStatusInfo(
		mockData.production ? stagesToEvents(mockData.production) : undefined,
		mockData.production?.updatedAt,
	);

	return (
		<PageLayout
			header={{
				title: "Seki Pipeline Preview (dev)",
			}}
		>
			<div className="max-w-4xl mx-auto space-y-6">
				<p className="text-xs text-muted-foreground">
					Sandbox de iteración visual con datos mokeados de la API real (sek.mock.json). Usa el componente productivo SekiPipelineMonitor + adapter. Ruta permanente — no borrar.
				</p>

				{/* Scenario toggle */}
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium text-muted-foreground">Escenario:</span>
					<button
						type="button"
						onClick={() => setScenario("normal")}
						className={`text-xs font-medium px-3 py-1 rounded-md border transition-colors ${scenario === "normal" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-muted/30"}`}
					>
						Normal (STARTED)
					</button>
					<button
						type="button"
						onClick={() => setScenario("failed")}
						className={`text-xs font-medium px-3 py-1 rounded-md border transition-colors ${scenario === "failed" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background text-foreground border-border hover:bg-muted/30"}`}
					>
						Deploy fallido (FAILED)
					</button>
				</div>

				{/* Monitor completo — vista de repo */}
				<section className="space-y-2">
					<h2 className="text-sm font-semibold text-muted-foreground">Monitor completo (vista repo)</h2>
					<SekiPipelineMonitorData data={activeData} />
				</section>

				{/* Monitor reducido — vista dashboard /github */}
				<section className="space-y-2">
					<h2 className="text-sm font-semibold text-muted-foreground">Monitor reducido (vista dashboard)</h2>
					<div className="border border-border rounded-md bg-card p-4 space-y-3">
						{mockData.staging && (
							<div className="grid grid-cols-[120px_1fr] gap-4 items-center">
								<span className="text-xs font-medium text-muted-foreground">Commit</span>
								<CommitLink
									hash={mockData.staging.ref}
									org="Cencosud-xlabs"
									repo="argentina-arcus"
									pipelineStatus={stagingStatus}
									isLoading={false}
									commitInfo={{
										shortHash: mockData.staging.ref,
										author: mockData.staging.commit?.author,
										message: mockData.staging.commit?.message,
									}}
								/>
							</div>
						)}
						{mockData.production && (
							<div className="grid grid-cols-[120px_1fr] gap-4 items-center">
								<span className="text-xs font-medium text-muted-foreground">Tag</span>
								<TagLink
									tagName={mockData.production.ref}
									org="Cencosud-xlabs"
									repo="argentina-arcus"
									pipelineStatus={productionStatus}
									isLoading={false}
									commitInfo={{
										author: mockData.production.commit?.author,
										message: mockData.production.commit?.message,
									}}
								/>
							</div>
						)}
					</div>
				</section>
			</div>
		</PageLayout>
	);
}
