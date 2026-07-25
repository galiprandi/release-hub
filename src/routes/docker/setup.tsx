import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Box, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef } from "@/hooks/useSetup";
import { detectOS } from "@/utils/os";
import { SetupCard } from "@/components/shared/SetupCard";

export const Route = createFileRoute("/docker/setup")({
	component: DockerSetupPage,
});

function DockerSetupPage() {
	const navigate = useNavigate();
	const detectedOS = detectOS();

	const requiredCommands: CommandDef[] = [
		{
			name: "docker",
			command: "docker",
			description: "Plataforma de contenedores para desarrollar, enviar y ejecutar aplicaciones. ReleaseHub lo utiliza para monitorear contenedores en ejecución y su estado.",
			setupInfo: {
				osCommands: [
					{ os: "macOS", cmd: "brew install --cask docker", label: "macOS (Homebrew)" },
					{ os: "Linux", cmd: "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh", label: "Linux (Script oficial)" },
					{ os: "Windows", cmd: "winget install Docker.DockerDesktop", label: "Windows" },
				],
			},
		},
	];

	const optionalCommands: CommandDef[] = [
		{
			name: "docker-compose",
			command: "docker-compose",
			description: "Herramienta para definir y ejecutar aplicaciones multi-contenedor con Docker. Opcional para funcionalidades avanzadas de orquestación.",
			setupInfo: {
				osCommands: [
					{ os: "macOS", cmd: "brew install docker-compose", label: "macOS (Homebrew)" },
					{ os: "Linux", cmd: "sudo apt install docker-compose", label: "Ubuntu/Debian" },
					{ os: "Windows", cmd: "docker-compose viene incluido en Docker Desktop", label: "Windows" },
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
					<Box className="w-5 h-5 text-primary" />
					<h1 className="text-2xl font-bold tracking-tight">Configuración de Docker</h1>
					<div className="flex-1" />
					<span className="px-2 py-1 rounded-md bg-muted/30 border border-border text-xs font-medium text-muted-foreground/60">
						OS: {detectedOS}
					</span>
				</div>
				<p className="text-muted-foreground text-sm">
					El módulo Docker requiere la instalación de Docker CLI. Docker Compose es opcional para funcionalidades avanzadas.
				</p>
			</div>

			{allRequiredInstalled && !isLoading && (
				<div className="flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/docker" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-medium shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						type="button"
					>
						Ir a Docker
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
						icon={<Box className="w-4 h-4" />}
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
					className="px-6 py-2.5 bg-muted/30 text-foreground rounded-lg hover:bg-muted/30 transition-all text-xs font-medium border border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					type="button"
				>
					Verificar configuración
				</button>
			</div>
		</div>
	);
}
