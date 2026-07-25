import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Terminal, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef } from "@/hooks/useSetup";
import { detectOS } from "@/utils/os";
import { SetupCard } from "@/components/shared/SetupCard";

export const Route = createFileRoute("/fetcher/setup")({
	component: FetcherSetupPage,
});

function FetcherSetupPage() {
	const navigate = useNavigate();
	const detectedOS = detectOS();

	const requiredCommands: CommandDef[] = [
		{
			name: "curl",
			command: "curl",
			description: "Herramienta de línea de comandos para transferir datos con URLs. ReleaseHub la utiliza para ejecutar y monitorear requests HTTP.",
			setupInfo: {
				osCommands: [
					{ os: "macOS", cmd: "curl viene preinstalado en macOS", label: "macOS" },
					{ os: "Linux", cmd: "sudo apt install curl", label: "Ubuntu/Debian" },
					{ os: "Windows", cmd: "curl viene preinstalado en Windows 10+", label: "Windows" },
				],
			},
		},
	];

	const optionalCommands: CommandDef[] = [
		{
			name: "jq",
			command: "jq",
			description: "Procesador de JSON liviano de línea de comandos. Opcional para parseo avanzado de respuestas HTTP en el Fetcher.",
			setupInfo: {
				osCommands: [
					{ os: "macOS", cmd: "brew install jq", label: "macOS (Homebrew)" },
					{ os: "Linux", cmd: "sudo apt install jq", label: "Ubuntu/Debian" },
					{ os: "Windows", cmd: "winget install jqlang.jq", label: "Windows" },
				],
			},
		},
	];

	const { results, allRequiredInstalled, isLoading } = useSetup({
		required: requiredCommands,
		optional: optionalCommands,
	});

	return (
		<div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<Terminal className="w-5 h-5 text-primary" />
					<h1 className="text-2xl font-bold tracking-tight">Configuración del Fetcher</h1>
					<div className="flex-1" />
					<span className="px-2 py-1 rounded-md bg-muted/30 border border-border text-xs font-medium text-muted-foreground">
						OS: {detectedOS}
					</span>
				</div>
				<p className="text-muted-foreground text-sm">
					El módulo Fetcher requiere la instalación de curl. jq es opcional para funcionalidades avanzadas de parseo JSON.
				</p>
			</div>

			{allRequiredInstalled && !isLoading && (
				<div className="flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/fetcher" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-medium shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1"
						type="button"
					>
						Ir a Fetcher
						<ArrowRight className="w-4 h-4" />
					</button>
				</div>
			)}

			<div className="space-y-4">
				{results.map((result) => (
					<SetupCard
						key={result.name}
						name={result.name}
						description={result.description || ""}
						isInstalled={result.isInstalled}
						isRequired={result.isRequired}
						version={result.version}
						icon={<Terminal className="w-4 h-4" />}
						detectedOS={detectedOS}
						commands={
							[...requiredCommands, ...optionalCommands]
								.find((c) => c.name === result.name)
								?.setupInfo?.osCommands.map((c) => ({
									label: c.label || c.os,
									cmd: c.cmd,
									os: c.os,
								})) || []
						}
					/>
				))}
			</div>

			<div className="flex justify-center pt-4">
				<button
					onClick={() => window.location.reload()}
					className="px-6 py-2.5 bg-muted/30 text-foreground rounded-lg hover:bg-muted/30 transition-all text-xs font-medium border border-border focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1"
					type="button"
				>
					Verificar configuración
				</button>
			</div>
		</div>
	);
}
