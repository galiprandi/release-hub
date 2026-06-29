/**
 * Ruta /dev/seki-preview — Sandbox de iteración visual para SekiPipelineMonitor
 *
 * ESTA RUTA NO DEBE SER BORRADA.
 *
 * Propósito: servir como entorno de diseño y iteración rápida para el componente
 * productivo SekiPipelineMonitor sin depender de la API real de Seki. Usa la
 * variante SekiPipelineMonitorData que acepta data directa como prop.
 *
 * Componentes involucrados:
 * - SekiPipelineMonitorData → src/plugins/pipeline/seki/components/SekiPipelineMonitor.tsx
 * - Mock data               → src/plugins/pipeline/seki/dev/mockData.ts
 *
 * Datos: mockStagingData (pipeline OK) y mockProductionData (pipeline FAILED).
 * Ambos derivan de respuestas reales de la API de Seki para fidelidad estructural.
 *
 * Mejoras futuras conocidas:
 * - Probar con data real del endpoint de Seki (no mock)
 * - Validar el fallback regex con logs reales (extractFallback)
 * - Mover los labels de stages a una sola palabra en la API real
 * - Considerar colapsar stages OK por defecto y expandir sólo el fallido
 */
import { createFileRoute } from "@tanstack/react-router";
import { SekiPipelineMonitorData } from "@/plugins/pipeline/seki/components";
import { mockStagingData, mockProductionData } from "@/plugins/pipeline/seki/dev/mockData";
import { PageLayout } from "@/layouts/PageLayout";

export const Route = createFileRoute("/dev/seki-preview")({
	component: SekiPreviewPage,
});

function SekiPreviewPage() {
	return (
		<PageLayout
			header={{
				title: "Seki Pipeline Preview (dev)",
			}}
		>
			<div className="max-w-4xl mx-auto space-y-4">
				<p className="text-xs text-muted-foreground">
					Sandbox de iteración visual con datos mokeados de la API real. Usa el componente productivo SekiPipelineMonitor. Ruta permanente — no borrar.
				</p>
				<SekiPipelineMonitorData
					data={{
						staging: mockStagingData,
						production: mockProductionData,
					}}
				/>
			</div>
		</PageLayout>
	);
}
