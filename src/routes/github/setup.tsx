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

	// useEffect(() => {
		// if (allOk && !isLoading) {
		// 	navigate({ to: "/github" });
		// }
	// }, [allOk, isLoading, navigate]);

	return (
		<div className="max-w-2xl mx-auto py-12 px-4">
			<h1 className="text-3xl font-bold mb-2">Configuración de GitHub</h1>
			<p className="text-muted-foreground mb-8">
				El módulo GitHub requiere la instalación y configuración previa de GitHub CLI y jq.
			</p>

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
						commands={[{ label: "", cmd: "gh auth login", os: null }]}
						detectedOS={detectedOS}
					/>
				)}
			</div>

			<div className="flex justify-center mt-8">
				<button
					onClick={() => window.location.reload()}
					className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
				>
					Verificar configuración
				</button>
			</div>

			{allOk && !isLoading && (
				<div className="flex justify-center mt-8">
					<button
						onClick={() => navigate({ to: "/github" })}
						className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
					>
						Ir a GitHub <ArrowRight className="w-4 h-4" />
					</button>
				</div>
			)}
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
