import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clipboard, ClipboardCheck, Box, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef, type OSType } from "@/hooks/useSetup";

export const Route = createFileRoute("/docker/setup")({
	component: DockerSetupPage,
});

function detectOS(): OSType {
	const userAgent = navigator.userAgent;
	if (userAgent.includes("Mac")) return "macOS";
	if (userAgent.includes("Linux")) return "Linux";
	if (userAgent.includes("Windows")) return "Windows";
	return "unknown";
}

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
		<div className="max-w-2xl mx-auto py-12 px-4">
			<h1 className="text-3xl font-bold mb-2">Configuración de Docker</h1>
			<p className="text-muted-foreground mb-8">
				El módulo Docker requiere la instalación de Docker CLI. Docker Compose es opcional para funcionalidades avanzadas.
			</p>

			{allRequiredInstalled && !isLoading && (
				<div className="mb-6 flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/docker" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						Ir a Docker
						<ArrowRight className="w-4 h-4" />
					</button>
				</div>
			)}

			<div className="space-y-3">
				{results.map((result) => (
					<div key={result.name}>
						{result.isInstalled ? (
							<div className="flex items-start gap-2 text-green-600 text-sm border border-green-200 rounded-lg p-4 bg-green-50/50">
								<CheckCircle className="w-5 h-5 mt-0.5" />
								<div className="flex-1">
									<p className="font-medium">{result.name}</p>
									<p className="text-muted-foreground text-xs">{result.description}</p>
									{result.version && <p className="text-xs text-muted-foreground mt-1">Versión: {result.version}</p>}
									{!result.isRequired && <p className="text-xs text-muted-foreground">(Opcional)</p>}
								</div>
							</div>
						) : (
							<MissingCard
								icon={<Box className="w-5 h-5" />}
								title={result.name}
								description={result.description || ""}
								commands={
									[...requiredCommands, ...optionalCommands]
										.find((c) => c.name === result.name)
										?.setupInfo?.osCommands.map((c) => ({
											label: c.label || c.os,
											cmd: c.cmd,
											os: c.os,
										})) || []
								}
								detectedOS={detectedOS}
							/>
						)}
					</div>
				))}
			</div>

			<div className="flex justify-center mt-8">
				<button
					onClick={() => window.location.reload()}
					className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
				>
					Verificar configuración
				</button>
			</div>
		</div>
	);
}

function MissingCard({
	icon,
	title,
	description,
	commands,
	detectedOS,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	commands: Array<{ label: string; cmd: string; os: OSType | null }>;
	detectedOS: OSType;
}) {
	const [open, setOpen] = useState(true);

	const filteredCommands = useMemo(() => {
		if (detectedOS === "unknown") {
			return commands;
		}
		return commands.filter((c) => c.os === detectedOS || c.os === null);
	}, [commands, detectedOS]);

	return (
		<div className="border border-red-200 rounded-lg p-4 bg-red-50/50">
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-3 text-left"
			>
				<XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
				<div className="flex-1">
					<h2 className="font-semibold flex items-center gap-2">
						{icon}
						{title}
					</h2>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
			</button>
			{open && (
				<div className="mt-3 bg-muted p-4 rounded-md text-sm font-mono space-y-3">
					{filteredCommands.map((c) => (
						<div key={c.cmd}>
							{c.label && <p className="text-muted-foreground"># {c.label}</p>}
							<div className="flex items-center justify-between gap-2 group">
								<p className="flex-1">{c.cmd}</p>
								<CopyButton text={c.cmd} />
							</div>
						</div>
					))}
					{detectedOS !== "unknown" && (
						<p className="text-xs text-muted-foreground mt-2">
							Comandos para {detectedOS} detectados.{" "}
							<button
								onClick={() => setOpen(true)}
								className="underline hover:text-foreground"
							>
								Ver todas las opciones
							</button>
						</p>
					)}
				</div>
			)}
		</div>
	);
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback: silently ignore if clipboard is unavailable
		}
	}, [text]);

	return (
		<button
			onClick={handleCopy}
			title="Copiar al portapapeles"
			className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted-foreground/20"
		>
			{copied ? (
				<ClipboardCheck className="w-4 h-4 text-green-600" />
			) : (
				<Clipboard className="w-4 h-4 text-muted-foreground" />
			)}
		</button>
	);
}
