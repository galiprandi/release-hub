import { useState } from "react";
import { clsx } from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { RefreshCw, Loader2, CheckCircle2, ExternalLink, Circle, AlertCircle } from "lucide-react";
import { usePrStatus } from "@/hooks/usePrStatus";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton";

interface ForceRedeployDialogProps {
	repo: string;
	iconOnly?: boolean;
	showLabel?: boolean;
}

type Step = "config" | "executing" | "success" | "error";

export function ForceRedeployDialog({ repo, iconOnly = false, showLabel = false }: ForceRedeployDialogProps) {
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<Step>("config");
	const [isExecuting, setIsExecuting] = useState(false);
	const [error, setError] = useState("");
	const [prUrl, setPrUrl] = useState<string | null>(null);
	const [prNumber, setPrNumber] = useState<string | null>(null);

	const { data: prStatus } = usePrStatus(repo, prNumber || "", step === "success" ? 5000 : undefined);

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (newOpen) {
			setStep("config");
			setError("");
			setPrUrl(null);
			setPrNumber(null);
		} else {
			// Detener polling al cerrar
			setPrNumber(null);
		}
	};

	const handleForceRedeploy = async () => {
		setIsExecuting(true);
		setStep("executing");
		setError("");

		try {
			const response = await fetch("/local/script", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ repo, action: "trigger-staging-redeploy" }),
			});

			if (!response.ok) {
				throw new Error("Error al ejecutar el script");
			}

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || "Error desconocido");
			}

			setPrUrl(data.prUrl);
			// Extraer número del PR de la URL
			const prMatch = data.prUrl?.match(/\/pull\/(\d+)/);
			if (prMatch) {
				setPrNumber(prMatch[1]);
			}

			setStep("success");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al ejecutar el script");
			setStep("error");
		} finally {
			setIsExecuting(false);
		}
	};

	const getStatusIcon = () => {
		if (!prStatus) return <Circle className="w-5 h-5 animate-pulse text-muted-foreground" />;
		if (prStatus.merged) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
		if (prStatus.status === "open") {
			if (prStatus.mergeable_state === "clean") return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
			if (prStatus.mergeable_state === "unstable") return <AlertCircle className="w-5 h-5 text-yellow-600" />;
			if (prStatus.mergeable_state === "dirty") return <AlertCircle className="w-5 h-5 text-red-600" />;
			return <Circle className="w-5 h-5 text-blue-600" />;
		}
		if (prStatus.status === "closed") return <AlertCircle className="w-5 h-5 text-red-600" />;
		return <Circle className="w-5 h-5 text-muted-foreground" />;
	};

	const getStatusColor = () => {
		if (!prStatus) return "text-muted-foreground";
		if (prStatus.merged) return "text-green-600";
		if (prStatus.status === "open") {
			if (prStatus.mergeable_state === "clean") return "text-blue-600";
			if (prStatus.mergeable_state === "unstable") return "text-yellow-600";
			if (prStatus.mergeable_state === "dirty") return "text-red-600";
			return "text-blue-600";
		}
		if (prStatus.status === "closed") return "text-red-600";
		return "text-muted-foreground";
	};

	const getStatusText = () => {
		if (!prStatus) return "Verificando estado...";
		if (prStatus.merged) return "Mergeado";
		if (prStatus.status === "open") {
			if (prStatus.mergeable_state === "clean") return "Listo para merge";
			if (prStatus.mergeable_state === "unstable") return "Checks pendientes";
			if (prStatus.mergeable_state === "dirty") return "Conflictos";
			return "Abierto";
		}
		if (prStatus.status === "closed") return "Cerrado";
		return prStatus.status;
	};

	const dialogWidth = step === "success" || step === "error" ? "max-w-md" : "max-w-lg";

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			{iconOnly ? (
				<ActionButton
					action={ACTION_DEFINITIONS.forceRedeploy}
					onClick={() => setOpen(true)}
					showLabel={showLabel}
				/>
			) : (
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<Dialog.Trigger asChild>
								<button
									type="button"
									className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
								>
									<RefreshCw className="w-4 h-4" />
									<span>Re Deploy</span>
								</button>
							</Dialog.Trigger>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								className="bg-popover text-popover-foreground border px-3 py-2 rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
								sideOffset={5}
							>
								<div className="text-xs space-y-1">
									<div className="font-medium">Forzar redeploy a staging</div>
									<div className="text-muted-foreground">
										Crear PR para forzar que Nx reconstruya el grafo de dependencias
									</div>
								</div>
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
				</Tooltip.Provider>
			)}
			<BaseDialog
				open={open}
				onOpenChange={handleOpenChange}
				title={
					<div className="flex items-center gap-2">
						{step === "config" && (
							<>
								<RefreshCw className="w-4 h-4 text-primary" />
								<span>Trigger Staging Redeploy</span>
							</>
						)}
						{step === "executing" && (
							<>
								<Loader2 className="w-4 h-4 animate-spin text-primary" />
								<span>Ejecutando...</span>
							</>
						)}
						{step === "success" && (
							<>
								<CheckCircle2 className="w-4 h-4 text-success" />
								<span>Redeploy Iniciado</span>
							</>
						)}
						{step === "error" && (
							<>
								<AlertCircle className="w-4 h-4 text-destructive" />
								<span>Error</span>
							</>
						)}
					</div>
				}
				description="Proceso de forzar redeploy a staging"
				maxWidth={dialogWidth}
			>
				{/* Step 1: Config */}
				{step === "config" && (
					<div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide">
						<div className="space-y-4">
							<p className="text-xs text-muted-foreground leading-relaxed">
								Se creará un PR para forzar redeploy de staging. El PR se mergeará
								automáticamente cuando pasen los checks de seguridad y las reglas del
								repositorio lo permiten.
							</p>
							<p className="text-xs text-muted-foreground leading-relaxed">
								En algunos casos, deberás hacer merge manual si el repo no permite auto
								merge.
							</p>

							<div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-3">
								<div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Pasos del Proceso:</div>
								<ul className="text-[11px] space-y-2 text-muted-foreground">
									<li className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
										Crear rama temporal
									</li>
									<li className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
										Modificar archivo dedicado
									</li>
									<li className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
										Crear PR con auto merge
									</li>
									<li className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
										Esperar checks de seguridad
									</li>
									<li className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
										Merge automático o manual
									</li>
								</ul>
							</div>
						</div>

						<div className="mt-8 pt-4 border-t border-border/40 flex justify-end gap-3 flex-shrink-0">
							<button
								type="button"
								onClick={() => handleOpenChange(false)}
								className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
							>
								Cancelar
							</button>
							<button
								onClick={handleForceRedeploy}
								disabled={isExecuting}
								className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 inline-flex items-center gap-2"
							>
								{isExecuting ? (
									<>
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
										Ejecutando...
									</>
								) : (
									<>
										<RefreshCw className="w-3.5 h-3.5" />
										Comenzar
									</>
								)}
							</button>
						</div>
					</div>
				)}

				{/* Step 2: Executing */}
				{step === "executing" && (
					<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
						<Loader2 className="w-12 h-12 animate-spin text-blue-600" />
						<div>
							<p className="text-lg font-semibold">Ejecutando script...</p>
							<p className="text-sm text-muted-foreground mt-1">
								Esto puede demorar unos segundos
							</p>
						</div>
					</div>
				)}

				{/* Step 3: Success */}
				{step === "success" && (
					<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-6">
						<div className="w-16 h-16 rounded-full bg-success/20 border border-success/20 flex items-center justify-center shadow-[0_0_20px_rgba(var(--success),0.1)]">
							{getStatusIcon()}
						</div>
						<div className="space-y-4">
							<div className="space-y-1">
								<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">PR #{prNumber} Creado</p>
								<p className={clsx("text-[10px] font-bold uppercase tracking-wider", getStatusColor())}>
									{getStatusText()}
								</p>
							</div>
							{prUrl && (
								<a
									href={prUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 px-4 py-2 bg-muted/20 border border-border/40 rounded-lg text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-muted/40 transition-all"
								>
									<span>Ver PR en GitHub</span>
									<ExternalLink className="w-3.5 h-3.5" />
								</a>
							)}
						</div>
						<button
							onClick={() => handleOpenChange(false)}
							className="w-full mt-4 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
						>
							Finalizar
						</button>
					</div>
				)}

				{/* Step 4: Error */}
				{step === "error" && (
					<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-6">
						<div className="w-16 h-16 rounded-full bg-destructive/20 border border-destructive/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(var(--destructive),0.1)]">
							<AlertCircle className="w-8 h-8 text-destructive" />
						</div>
						<div className="space-y-2">
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">Error en la ejecución</p>
							<div className="bg-muted/10 border border-border/40 rounded-xl p-4 text-xs font-mono text-destructive leading-relaxed text-left">
								{error}
							</div>
						</div>
						<div className="flex gap-3 w-full">
							<button
								onClick={() => handleOpenChange(false)}
								className="flex-1 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border border-border/60 rounded-lg hover:bg-muted/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
							>
								Cerrar
							</button>
							<button
								onClick={() => {
									setStep("config");
									setError("");
								}}
								className="flex-1 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
							>
								Reintentar
							</button>
						</div>
					</div>
				)}
			</BaseDialog>
		</Dialog.Root>
	);
}
