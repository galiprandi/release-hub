import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Clipboard, ClipboardCheck, Ship, ArrowRight } from "lucide-react";
import { useSetup, type CommandDef, type OSType } from "@/hooks/useSetup";

export const Route = createFileRoute("/kubernetes/setup")({
	component: KubernetesSetupPage,
});

function detectOS(): OSType {
	const userAgent = navigator.userAgent;
	if (userAgent.includes("Mac")) return "macOS";
	if (userAgent.includes("Linux")) return "Linux";
	if (userAgent.includes("Windows")) return "Windows";
	return "unknown";
}

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
		<div className="max-w-2xl mx-auto py-12 px-4">
			<h1 className="text-3xl font-bold mb-2">Configuración de Kubernetes</h1>
			<p className="text-muted-foreground mb-8">
				El módulo Kubernetes requiere la instalación de kubectl. Helm es opcional para funcionalidades avanzadas.
			</p>

			{allRequiredInstalled && !isLoading && (
				<div className="mb-6 flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/kubernetes" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						Ir a Kubernetes
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
								icon={<Ship className="w-5 h-5" />}
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

			{allRequiredInstalled && (
				<div className="mt-8 p-4 bg-success/5 border border-success/20 rounded-lg">
					<div className="flex items-center gap-2 text-success font-bold">
						<CheckCircle className="w-5 h-5" />
						<span className="font-medium uppercase tracking-tight">Configuración completada con éxito</span>
					</div>
					<p className="text-sm text-success/80 mt-1">Redirección a la página principal...</p>
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
		<div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
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
