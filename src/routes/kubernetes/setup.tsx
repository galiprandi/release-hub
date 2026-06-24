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
		<div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight mb-2">Configuración de Kubernetes</h1>
				<p className="text-muted-foreground text-sm">
					El módulo Kubernetes requiere la instalación de kubectl. Helm es opcional para funcionalidades avanzadas.
				</p>
			</div>

			{allRequiredInstalled && !isLoading && (
				<div className="flex items-center justify-end">
					<button
						onClick={() => navigate({ to: "/kubernetes" })}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-[10px] font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						Ir a Kubernetes
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
								icon={<Ship className="w-5 h-5" />}
								title={result.name}
								description={result.description || ""}
								isRequired={result.isRequired}
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
	isRequired,
	commands,
	detectedOS,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	isRequired: boolean;
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

	const containerStyles = isRequired
		? "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15"
		: "border-warning/20 bg-warning/10 text-warning hover:bg-warning/15";

	const iconStyles = isRequired ? "text-destructive" : "text-warning";
	const badgeStyles = isRequired
		? "bg-destructive/20 border-destructive/20"
		: "bg-warning/20 border-warning/20";

	return (
		<div className={`border rounded-xl p-4 shadow-sm transition-all ${containerStyles}`}>
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-3 text-left focus-visible:outline-none"
			>
				<XCircle className={`w-5 h-5 flex-shrink-0 ${iconStyles}`} />
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h2 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${iconStyles}`}>
							{icon}
							{title}
						</h2>
						<span className={`px-1.5 py-0.5 rounded-md border text-[8px] font-bold uppercase ${badgeStyles}`}>
							{isRequired ? "Requerido" : "Opcional"}
						</span>
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
