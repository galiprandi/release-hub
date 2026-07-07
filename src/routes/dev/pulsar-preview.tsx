/**
 * Ruta /dev/pulsar-preview — Sandbox de iteración visual para PulsarBuildMonitor
 *
 * ESTA RUTA NO DEBE SER BORRADA.
 *
 * Propósito: servir como entorno de diseño y iteración rápida para el componente
 * productivo PulsarBuildMonitor sin depender de la API real de GitHub Actions.
 * Usa la variante PulsarBuildMonitorData que acepta data directa como prop.
 *
 * Componentes involucrados:
 * - PulsarBuildMonitorData → src/plugins/pipeline/pulsar/components/PulsarBuildMonitor.tsx
 * - Mock data               → src/plugins/pipeline/pulsar/dev/mockData.ts
 *
 * Datos: mockStagingData (pipeline OK), mockProductionData (pipeline FAILED con 1 imagen fallida),
 * y mockRunningData (pipeline en progreso).
 */
import { createFileRoute } from '@tanstack/react-router'
import { PulsarBuildMonitorData } from '@/plugins/pipeline/pulsar/components'
import {
	mockStagingData,
	mockProductionData,
	mockRunningData,
} from '@/plugins/pipeline/pulsar/dev/mockData'
import { PageLayout } from '@/layouts/PageLayout'

export const Route = createFileRoute('/dev/pulsar-preview')({
	component: PulsarPreviewPage,
})

function PulsarPreviewPage() {
	return (
		<PageLayout
			header={{
				title: 'Pulsar Build Preview (dev)',
			}}
		>
			<div className="max-w-4xl mx-auto space-y-6">
				<p className="text-xs text-muted-foreground">
					Sandbox de iteración visual con datos mokeados de respuestas reales de GitHub Actions.
					Usa el componente productivo PulsarBuildMonitor. Ruta permanente — no borrar.
				</p>

				<div className="space-y-2">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Staging OK + Production FAILED (1 imagen fallida)
					</span>
					<PulsarBuildMonitorData
						data={{
							staging: mockStagingData,
							production: mockProductionData,
						}}
					/>
				</div>

				<div className="space-y-2">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						Production en progreso (building)
					</span>
					<PulsarBuildMonitorData
						data={{
							staging: null,
							production: mockRunningData,
						}}
					/>
				</div>
			</div>
		</PageLayout>
	)
}
