import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PromoteDialog } from "@/components/PromoteDialog";
import { NovedadesDialog } from "@/components/NovedadesDialog";
import { ProjectSelector } from "@/components/ProjectSelector";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { CommitsModal } from "@/components/CommitsModal";
import { LogsViewer } from "@/components/shared/LogsViewer";
import { MiniTimeline } from "@/components/SekiMonitor/MiniTimeline";
import { DisplayInfo } from "@/components/DisplayInfo";
import { AISummaryCard } from "@/components/AISummaryCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { Layout } from "lucide-react";
import type { Event } from "@/api/seki.type";

export const Route = createFileRoute("/verification-page")({
	component: VerificationPage,
});

function VerificationPage() {
	const [isCommitsModalOpen, setIsCommitsModalOpen] = useState(false);
	const [isLogsViewerOpen, setIsLogsViewerOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchValue, setSearchValue] = useState("");

	const mockCommits = [
		{
			hash: "hash1",
			shortHash: "h1",
			subject: "Feature: Add support for BaseDialog",
			body: "Implement BaseDialog to standardize modal behavior across the app.",
			message: "Feature: Add support for BaseDialog\n\nImplement BaseDialog to standardize modal behavior across the app.",
			author: "Jules Agent",
			date: "2024-05-20",
		},
		{
			hash: "hash2",
			shortHash: "h2",
			subject: "Fix: Memory leak in useAISummarize",
			body: "Fixes a memory leak where the AI summarizer would not clean up properly.",
			message: "Fix: Memory leak in useAISummarize\n\nFixes a memory leak where the AI summarizer would not clean up properly.",
			author: "Jules Agent",
			date: "2024-05-19",
		},
		{
			hash: "hash3",
			shortHash: "h3",
			subject: "Docs: Update AGENTS.md",
			body: "Added new instructions for frontend verification.",
			message: "Docs: Update AGENTS.md\n\nAdded new instructions for frontend verification.",
			author: "Jules Agent",
			date: "2024-05-18",
		}
	];
	const mockEvents: Event[] = [
		{
			id: "1",
			label: { es: "Build exitoso", en: "Successful Build", br: "Build" },
			state: "SUCCESS",
			created_at: "2024-05-20T10:00:00Z",
			updated_at: "2024-05-20T10:05:00Z",
			subevents: [
				{
					id: "1-1",
					label: "Compilación",
					state: "SUCCESS",
					created_at: "2024-05-20T10:00:00Z",
					updated_at: "2024-05-20T10:02:00Z",
					markdown: "### Logs de compilación\n\nTodo salió bien.",
				},
			],
			markdown: "Build completado en 5m",
		},
		{
			id: "2",
			label: { es: "Despliegue fallido", en: "Failed Deploy", br: "Deploy" },
			state: "FAILED",
			created_at: "2024-05-20T10:05:00Z",
			updated_at: "2024-05-20T10:10:00Z",
			subevents: [],
			markdown: "Error al conectar con el cluster",
		},
		{
			id: "3",
			label: { es: "Ejecutando tests", en: "Running tests", br: "Tests" },
			state: "RUNNING",
			created_at: "2024-05-20T10:10:00Z",
			updated_at: "2024-05-20T10:15:00Z",
			subevents: [],
			markdown: "",
		}
	];

	return (
		<div className="container mx-auto p-10 flex flex-col min-h-screen gap-10">
			<PageHeader icon={Layout} title="Panel de Verificación de UX (Croma)" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
                <section className="p-8 border rounded-xl bg-card shadow-sm space-y-6">
                    <h2 className="text-lg font-semibold border-b pb-2">Refactorización de Diálogos (BaseDialog)</h2>
                    <div className="flex gap-4 flex-wrap">
                        <PromoteDialog repo="galiprandi/release-hub" latestTag="v1.2.3" />
                        <NovedadesDialog />
                        <FeedbackDialog />
                        <button
                            type="button"
                            onClick={() => setIsCommitsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
                        >
                            Ver Commits (Modal)
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLogsViewerOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
                        >
                            Ver LogsViewer
                        </button>
                    </div>
                    <CommitsModal
                        isOpen={isCommitsModalOpen}
                        onClose={() => setIsCommitsModalOpen(false)}
                        commits={mockCommits}
                        prodCommitHash="hash-none"
                        prodTag="v1.2.2"
                    />
                    {isLogsViewerOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                            <div className="w-full max-w-4xl h-[80vh]">
                                <LogsViewer
                                    queryFn={async () => "2024-05-20 INFO: Application started\n2024-05-20 WARN: Low memory\n2024-05-20 ERROR: Connection failed\n2024-05-20 DEBUG: Initializing components"}
                                    onClose={() => setIsLogsViewerOpen(false)}
                                    asModal={false}
                                    resources={[{ id: "main", name: "Main Container", type: "pod" }]}
                                />
                            </div>
                        </div>
                    )}
                </section>

                <section className="p-8 border rounded-xl bg-card shadow-sm space-y-6">
                    <h2 className="text-lg font-semibold border-b pb-2">Componentes Compartidos</h2>
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">FilterBar</h3>
                            <FilterBar
                                filters={[
                                    { value: "all", label: "Todos" },
                                    { value: "active", label: "Activos" },
                                    { value: "error", label: "Errores" }
                                ]}
                                activeFilter={activeFilter}
                                onFilterChange={setActiveFilter}
                                searchPlaceholder="Buscar..."
                                searchValue={searchValue}
                                onSearchChange={setSearchValue}
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">ProjectSelector</h3>
                            <ProjectSelector repo="galiprandi/release-hub" />
                        </div>
                    </div>
                </section>

				<section className="p-8 border rounded-xl bg-card shadow-sm space-y-6 md:col-span-2">
                    <h2 className="text-lg font-semibold border-b pb-2">Estandarización de MiniTimeline, DisplayInfo y AISummaryCard</h2>
                    <div className="flex flex-col gap-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground">AISummaryCard (Nuevos Tokens Semánticos)</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <AISummaryCard
                                    summary="Este es un resumen generado por IA utilizando los nuevos tokens semánticos del sistema de diseño."
                                    isGenerating={false}
                                    error={null}
                                    onRegenerate={() => {}}
                                    onCopy={() => {}}
                                    isCollapsed={false}
                                    onToggleCollapse={() => {}}
                                    isCopied={false}
                                />
                                <AISummaryCard
                                    summary="Resumen compacto."
                                    isGenerating={true}
                                    error={null}
                                    onRegenerate={() => {}}
                                    onCopy={() => {}}
                                    isCollapsed={false}
                                    onToggleCollapse={() => {}}
                                    isCopied={false}
                                    variant="compact"
                                />
                                <AISummaryCard
                                    summary="Resumen con error."
                                    isGenerating={false}
                                    error="No se pudo conectar con el servicio de IA."
                                    onRegenerate={() => {}}
                                    onCopy={() => {}}
                                    isCollapsed={false}
                                    onToggleCollapse={() => {}}
                                    isCopied={false}
                                />
                                <AISummaryCard
                                    summary="Resumen colapsado."
                                    isGenerating={false}
                                    error={null}
                                    onRegenerate={() => {}}
                                    onCopy={() => {}}
                                    isCollapsed={true}
                                    onToggleCollapse={() => {}}
                                    isCopied={false}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-8">
                        <div className="p-4 bg-muted/20 rounded-lg">
                            <MiniTimeline events={mockEvents} />
                        </div>
                        <div className="flex flex-wrap gap-8 p-4 bg-muted/10 rounded-lg">
                            <DisplayInfo type="commit" value="a1b2c3d" />
                            <DisplayInfo type="tag" value="v1.5.0" />
                            <DisplayInfo type="dates" value="2024-05-20T10:00:00Z" />
                            <DisplayInfo type="author" value="Jules Agent" />
                            <DisplayInfo type="message" value="This is a very long commit message that should definitely trigger a tooltip when hovered or focused by the user." maxChar={20} />
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Pruebas Visuales:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>PageHeader: Verificar icono con fondo sutil y color primario.</li>
                            <li>FilterBar: Verificar colores semánticos, bordes de input y anillos de foco con offset.</li>
                            <li>DisplayInfo: Verificar colores semánticos (azul para commit, púrpura/ai para tag).</li>
                        </ul>
                    </div>
                </section>
            </div>
		</div>
	);
}
