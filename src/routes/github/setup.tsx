import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Github, Download, LogIn, Terminal, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef } from "@/hooks/useSetup";
import { useGhCliSetup } from "@/hooks/useGhCliSetup";
import { detectOS } from "@/utils/os";
import { SetupCard } from "@/components/shared/SetupCard";

export const Route = createFileRoute("/github/setup")({
	component: GitHubSetupPage,
});

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
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<Github className="w-5 h-5 text-primary" />
					<h1 className="text-2xl font-bold tracking-tight">Configuración de GitHub</h1>
					<div className="flex-1" />
					<span className="px-2 py-1 rounded-md bg-muted/40 border border-border/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						OS: {detectedOS}
					</span>
				</div>
				<p className="text-muted-foreground text-sm">
					El módulo GitHub requiere la instalación y configuración previa de GitHub CLI y jq.
				</p>
			</div>

			{allOk && !isLoading && (
				<div className="flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/github" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						type="button"
					>
						Ir a GitHub
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
						icon={result.name === "gh" ? <Download className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
						detectedOS={detectedOS}
						commands={
							requiredCommands
								.find((c) => c.name === result.name)
								?.setupInfo?.osCommands.map((c) => ({
									label: c.label || c.os,
									cmd: c.cmd,
									os: c.os,
								})) || []
						}
					/>
				))}

				{ghInstalled && (
					<SetupCard
						name="Autenticación con GitHub"
						description="Autentica tu cuenta de GitHub en la CLI para que ReleaseHub pueda acceder a tus repositorios y organizaciones. Este paso abre un flujo OAuth en tu navegador."
						isInstalled={isAuthenticated}
						isRequired={true}
						icon={<LogIn className="w-4 h-4" />}
						detectedOS={detectedOS}
						commands={[{ label: "Auth Flow", cmd: "gh auth login", os: null }]}
					/>
				)}
			</div>

			<div className="flex justify-center pt-4">
				<button
					onClick={() => window.location.reload()}
					className="px-6 py-2.5 bg-muted/20 text-foreground rounded-lg hover:bg-muted/30 transition-all text-xs font-bold uppercase tracking-wider border border-border/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					type="button"
				>
					Verificar configuración
				</button>
			</div>
		</div>
	);
}
