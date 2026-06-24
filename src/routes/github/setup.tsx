import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clipboard, ClipboardCheck, Download, LogIn, Terminal, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef, type OSType } from "@/hooks/useSetup";
import { useGhCliSetup } from "@/hooks/useGhCliSetup";

export const Route = createFileRoute("/github/setup")({
	component: GitHubSetupPage,
});

function detectOS(): OSType {
	const userAgent = navigator.userAgent;
	if (userAgent.includes("Mac")) return "macOS";
	if (userAgent.includes("Linux")) return "Linux";
	if (userAgent.includes("Windows")) return "Windows";
	return "unknown";
}

function GitHubSetupPage() {
	const navigate = useNavigate();
	const { isInstalled: ghInstalled, isAuthenticated } = useGhCliSetup();
	const detectedOS = detectOS();

	const requiredCommands: CommandDef[] = [
		{
			name: "gh",
			command: "gh",
			description: "Interfaz de línea de comandos oficial de GitHub. Se usa para listar repositorios, crear tags y obtener información de commits directamente desde la API de GitHub sin necesidad de clonar los repos.",
			setupInfo: {
				osCommands: [
					{ os: "macOS", cmd: "brew install gh", label: "macOS (Homebrew)" },
					{ os: "Linux", cmd: "sudo apt install gh", label: "Ubuntu/Debian" },
					{ os: "Windows", cmd: "winget install GitHub.cli", label: "Windows" },
				],
			},
		},
		{
			name: "jq",
			command: "jq",
			description: "Procesador de JSON liviano de línea de comandos. ReleaseHub lo utiliza para filtrar y transformar las respuestas de la API de GitHub antes de mostrarlas en la interfaz.",
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
	});

	const allOk = allRequiredInstalled && isAuthenticated;

	return (
		<div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight mb-2">Configuración de GitHub</h1>
				<p className="text-muted-foreground text-sm">
					El módulo GitHub requiere la instalación y configuración previa de GitHub CLI y jq.
				</p>
			</div>

			{allOk && !isLoading && (
				<div className="flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/github" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-[10px] font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						Ir a GitHub
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
								</div>
							</div>
						) : (
							<MissingCard
								icon={result.name === "gh" ? <Download className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
								title={result.name}
								description={result.description || ""}
								commands={
									requiredCommands.find((c) => c.name === result.name)?.setupInfo?.osCommands.map((c) => ({
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

				{ghInstalled && !isAuthenticated && (
					<MissingCard
						icon={<LogIn className="w-5 h-5" />}
						title="Autenticación con GitHub"
						description="Autentica tu cuenta de GitHub en la CLI para que ReleaseHub pueda acceder a tus repositorios y organizaciones. Este paso abre un flujo OAuth en tu navegador."
						commands={[{ label: "Auth Flow", cmd: "gh auth login", os: null }]}
						detectedOS={detectedOS}
					/>
				)}
			</div>

			<div className="flex justify-center pt-4">
				<button
					onClick={() => window.location.reload()}
					className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-[10px] font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
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
				<div className="mt-4 bg-muted/10 border border-border/40 p-4 rounded-lg text-sm font-mono space-y-3 text-foreground">
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
