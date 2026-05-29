import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clipboard, ClipboardCheck, Terminal, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef, type OSType } from "@/hooks/useSetup";

export const Route = createFileRoute("/fetcher/setup")({
	component: FetcherSetupPage,
});

function detectOS(): OSType {
	const userAgent = navigator.userAgent;
	if (userAgent.includes("Mac")) return "macOS";
	if (userAgent.includes("Linux")) return "Linux";
	if (userAgent.includes("Windows")) return "Windows";
	return "unknown";
}

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
		<div className="max-w-2xl mx-auto py-12 px-4">
			<h1 className="text-3xl font-bold mb-2">Configuración del Fetcher</h1>
			<p className="text-muted-foreground mb-8">
				El módulo Fetcher requiere la instalación de curl. jq es opcional para funcionalidades avanzadas de parseo JSON.
			</p>

			{allRequiredInstalled && !isLoading && (
				<div className="mb-6 flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/fetcher" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						Ir a Fetcher
						<ArrowRight className="w-4 h-4" />
					</button>
				</div>
			)}

			<div className="space-y-3">
				{results.map((result) => (
					<div key={result.name}>
						{result.isInstalled ? (
							<div className="flex items-start gap-2 text-success text-sm border border-success/20 rounded-lg p-4 bg-success/5">
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
								icon={<Terminal className="w-5 h-5" />}
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
		<div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5/50">
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-3 text-left"
			>
				<XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
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
				<ClipboardCheck className="w-4 h-4 text-success" />
			) : (
				<Clipboard className="w-4 h-4 text-muted-foreground" />
			)}
		</button>
	);
}
