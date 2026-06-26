import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ship, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef } from "@/hooks/useSetup";
import { detectOS } from "@/utils/os";
import { SetupCard } from "@/components/shared/SetupCard";

export const Route = createFileRoute("/kubernetes/setup")({
	component: KubernetesSetupPage,
});

function KubernetesSetupPage() {
	const navigate = useNavigate();
	const detectedOS = detectOS();

	const requiredCommands: CommandDef[] = [
		{
			name: "kubectl",
			command: "kubectl",
			description: "Herramienta de línea de comandos de Kubernetes para controlar clusters. ReleaseHub lo utiliza para monitorear deployments y pods.",
			setupInfo: {
				osCommands: [
					{ os: "macOS", cmd: "brew install kubectl", label: "macOS (Homebrew)" },
					{ os: "Linux", cmd: "curl -LO \"https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl\" && sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl", label: "Linux (Binario oficial)" },
					{ os: "Windows", cmd: "winget install -e --id Kubernetes.kubectl", label: "Windows" },
				],
			},
		},
	];

	const optionalCommands: CommandDef[] = [
		{
			name: "helm",
			command: "helm",
			description: "Gestor de paquetes para Kubernetes. Opcional para funcionalidades avanzadas de gestión de releases.",
			setupInfo: {
				osCommands: [
					{ os: "macOS", cmd: "brew install helm", label: "macOS (Homebrew)" },
					{ os: "Linux", cmd: "curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash", label: "Linux (Script oficial)" },
					{ os: "Windows", cmd: "winget install Helm.Helm", label: "Windows" },
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
					<Ship className="w-5 h-5 text-primary" />
					<h1 className="text-2xl font-bold tracking-tight">Configuración de Kubernetes</h1>
					<div className="flex-1" />
					<span className="px-2 py-1 rounded-md bg-muted/40 border border-border/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
						OS: {detectedOS}
					</span>
				</div>
				<p className="text-muted-foreground text-sm">
					El módulo Kubernetes requiere la instalación de kubectl. Helm es opcional para funcionalidades avanzadas.
				</p>
			</div>

			{allRequiredInstalled && !isLoading && (
				<div className="flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/kubernetes" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						type="button"
					>
						Ir a Kubernetes
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
						icon={<Ship className="w-4 h-4" />}
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
					className="px-6 py-2.5 bg-muted/20 text-foreground rounded-lg hover:bg-muted/30 transition-all text-xs font-bold uppercase tracking-wider border border-border/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					type="button"
				>
					Verificar configuración
				</button>
			</div>
		</div>
	);
}
