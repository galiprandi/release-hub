import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { RefreshCw, Loader2, CheckCircle2, ExternalLink, Circle, AlertCircle } from "lucide-react";
import { usePrStatus } from "../hooks/usePrStatus";
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
		if (prStatus.merged) return <CheckCircle2 className="w-5 h-5 text-success" />;
		if (prStatus.status === "open") {
			if (prStatus.mergeable_state === "clean") return <CheckCircle2 className="w-5 h-5 text-info" />;
			if (prStatus.mergeable_state === "unstable") return <AlertCircle className="w-5 h-5 text-warning" />;
			if (prStatus.mergeable_state === "dirty") return <AlertCircle className="w-5 h-5 text-destructive" />;
			return <Circle className="w-5 h-5 text-info" />;
		}
		if (prStatus.status === "closed") return <AlertCircle className="w-5 h-5 text-destructive" />;
		return <Circle className="w-5 h-5 text-muted-foreground" />;
	};

	const getStatusColor = () => {
		if (!prStatus) return "text-muted-foreground";
		if (prStatus.merged) return "text-success";
		if (prStatus.status === "open") {
			if (prStatus.mergeable_state === "clean") return "text-info";
			if (prStatus.mergeable_state === "unstable") return "text-warning";
			if (prStatus.mergeable_state === "dirty") return "text-destructive";
			return "text-info";
		}
		if (prStatus.status === "closed") return "text-destructive";
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
									className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-info text-info-foreground rounded-md hover:opacity-90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
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
					<>
						{step === "config" && <><RefreshCw className="w-4 h-4" /> Trigger Staging Redeploy</>}
						{step === "executing" && <><Loader2 className="w-4 h-4 animate-spin" /> Ejecutando...</>}
						{step === "success" && <><CheckCircle2 className="w-4 h-4 text-success" /> Redeploy Iniciado</>}
						{step === "error" && <><RefreshCw className="w-4 h-4 text-destructive" /> Error</>}
					</>
				}
				description="Proceso de forzar redeploy a staging"
				maxWidth={dialogWidth}
			>
				{/* Step 1: Config */}
				{step === "config" && (
					<div className="flex flex-col flex-1 overflow-y-auto">
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Se creará un PR para forzar redeploy de staging. El PR se mergeará
								automáticamente cuando pasen los checks de seguridad y las reglas del
								repositorio lo permiten.
							</p>
							<p className="text-sm text-muted-foreground">
								En algunos casos, deberás hacer merge manual si el repo no permite auto
								merge.
							</p>

							<div className="border rounded-md p-4 space-y-2">
								<div className="text-sm font-medium">Pasos:</div>
								<ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
									<li>Crear rama temporal</li>
									<li>Modificar archivo dedicado</li>
									<li>Crear PR con auto merge</li>
									<li>Esperar checks de seguridad</li>
									<li>Merge automático o manual</li>
								</ul>
							</div>
						</div>

						<div className="mt-4 pt-4 border-t flex justify-end gap-2 flex-shrink-0">
							<Dialog.Close asChild>
								<button
									type="button"
									className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
								>
									Cancelar
								</button>
							</Dialog.Close>
							<button
								onClick={handleForceRedeploy}
								disabled={isExecuting}
								className="px-4 py-2 text-sm font-medium bg-info text-info-foreground rounded-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
							>
								{isExecuting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Ejecutando...
									</>
								) : (
									<>
										<RefreshCw className="w-4 h-4" />
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
						<Loader2 className="w-12 h-12 animate-spin text-info" />
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
					<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
						<div className="text-5xl">
							{getStatusIcon()}
						</div>
						<div className="space-y-2">
							<p className="text-lg font-semibold">
								PR #{prNumber} creado
							</p>
							<div className={`text-lg font-medium ${getStatusColor()}`}>
								{getStatusText()}
							</div>
							{prUrl && (
								<a
									href={prUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-sm text-info hover:underline"
								>
									Ver PR en GitHub
									<ExternalLink className="w-3 h-3" />
								</a>
							)}
						</div>
						<Dialog.Close asChild>
							<button className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
								Cerrar
							</button>
						</Dialog.Close>
					</div>
				)}

				{/* Step 4: Error */}
				{step === "error" && (
					<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
						<RefreshCw className="w-12 h-12 text-destructive" />
						<div className="space-y-2">
							<p className="text-lg font-semibold">Error</p>
							<p className="text-sm text-destructive">{error}</p>
						</div>
						<div className="flex gap-2">
							<Dialog.Close asChild>
								<button className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors">
									Cerrar
								</button>
							</Dialog.Close>
							<button
								onClick={() => {
									setStep("config");
									setError("");
								}}
								className="px-4 py-2 text-sm font-medium bg-info text-info-foreground rounded-md hover:opacity-90 transition-colors"
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
