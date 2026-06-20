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
		<div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight mb-2">Configuración de Docker</h1>
				<p className="text-muted-foreground text-sm">
					El módulo Docker requiere la instalación de Docker CLI. Docker Compose es opcional para funcionalidades avanzadas.
				</p>
			</div>

			{allRequiredInstalled && !isLoading && (
				<div className="flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/docker" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-[10px] font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						Ir a Docker
						<ArrowRight className="w-4 h-4" />
					</button>
				</div>
			)}

			<div className="space-y-4">
				{results.map((result) => (
					<div key={result.name}>
						{result.isInstalled ? (
							<div className="flex items-start gap-3 text-success text-sm border border-success/20 rounded-xl p-4 bg-success/10 shadow-sm transition-all hover:bg-success/20">
								<CheckCircle className="w-5 h-5 mt-0.5" />
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<p className="text-[10px] font-bold uppercase tracking-wider">{result.name}</p>
										<span className="px-1.5 py-0.5 rounded-md bg-success/20 border border-success/20 text-[8px] font-bold uppercase">Instalado</span>
									</div>
									<p className="text-muted-foreground text-xs mt-1 leading-relaxed">{result.description}</p>
									{result.version && <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">Versión: {result.version}</p>}
									{!result.isRequired && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">(Opcional)</p>}
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

			<div className="flex justify-center pt-4">
				<button
					onClick={() => window.location.reload()}
					className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
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
		<div className="border border-destructive/20 rounded-xl p-4 bg-destructive/10 shadow-sm text-destructive transition-all hover:bg-destructive/15">
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-3 text-left focus-visible:outline-none"
			>
				<XCircle className="w-5 h-5 flex-shrink-0" />
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h2 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
							{icon}
							{title}
						</h2>
						<span className="px-1.5 py-0.5 rounded-md bg-destructive/20 border border-destructive/20 text-[8px] font-bold uppercase">Requerido</span>
					</div>
					<p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{description}</p>
				</div>
				{open ? <ChevronDown className="w-4 h-4 text-muted-foreground/60" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/60" />}
			</button>
			{open && (
				<div className="mt-4 bg-muted/10 border border-border/40 p-4 rounded-lg text-sm font-mono space-y-3">
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
			className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
		>
			{copied ? (
				<ClipboardCheck className="w-4 h-4 text-success" />
			) : (
				<Clipboard className="w-4 h-4 text-muted-foreground" />
			)}
		</button>
	);
}
