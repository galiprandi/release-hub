import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, X, ClipboardCopy, Check, Sparkles, AlertCircle, Pause, Play, Terminal, Maximize2, Minimize2, Search, ChevronUp, ChevronDown } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useAISummarize } from "@galiprandi/react-tools";
import { useAIErrorProcessor } from "@/hooks/useAIErrorProcessor";
import { useLogsAccumulator } from "@/hooks/useLogsAccumulator";
import { AISummaryCard } from "@/components/shared/AISummaryCard";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { XTermLogs, type XTermLogsHandle } from "./XTermLogs";
import { groupLogs, logLevelPattern } from "./logUtils";
import { IconButton } from "./IconButton";
import { cn } from "@/lib/utils";

export interface LogsViewerProps {
	/**
	 * Function to fetch logs. Accepts an optional cursor (timestamp) parameter.
	 * Returns the logs as a string.
	 */
	fetchFn: (cursor?: number) => Promise<string>;
	onClose: () => void;
	asModal?: boolean;
	resources?: { id: string; name: string; type: string }[];
	selectedResourceId?: string;
	onResourceChange?: (resourceId: string) => void;
}

export function LogsViewer({
	fetchFn,
	onClose,
	asModal = true,
	resources,
	selectedResourceId,
	onResourceChange,
}: LogsViewerProps) {
	const queryClient = useQueryClient();

	const [logLevelFilter, setLogLevelFilter] = useState<"all" | "ERROR" | "WARN" | "INFO" | "DEBUG">("all");
	const [copied, setCopied] = useState(false);
	const [aiSummaryCopied, setAiSummaryCopied] = useState(false);
	const [isAiSummaryCollapsed, setIsAiSummaryCollapsed] = useState(false);
	const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
	const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
	const autoScrollEnabledRef = useRef(autoScrollEnabled);
	const containerRef = useRef<HTMLDivElement>(null);

	const [isExpanded, setIsExpanded] = useState(() => {
		try {
			const saved = localStorage.getItem("release_hub_logs_expanded");
			return saved !== null ? JSON.parse(saved) : false;
		} catch {
			return false;
		}
	});

	const [filter, setFilter] = useState("");
	const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const xtermRef = useRef<XTermLogsHandle>(null);

	useEffect(() => {
		try {
			localStorage.setItem("release_hub_logs_expanded", JSON.stringify(isExpanded));
		} catch (e) {
			console.error("Error saving isExpanded to localStorage:", e);
		}
	}, [isExpanded]);
	
	const { data: logsData, isLoading, error } = useLogsAccumulator({
		fetchFn,
		resourceId: selectedResourceId || '',
		autoScrollEnabled,
		refetchInterval: 3000,
	});

	// Concatenate all pages to get accumulated logs
	const logs = logsData?.pages?.join('\n') || "";

	const currentLogs = logs || "";
	const currentError = error;
	const currentIsLoading = isLoading;

	// Sync ref with state
	useEffect(() => {
		autoScrollEnabledRef.current = autoScrollEnabled;
	}, [autoScrollEnabled]);

	// Handle Cmd+F / Ctrl+F to focus search input
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	// Prevenir scroll del body cuando el modal está abierto
	useEffect(() => {
		if (asModal) {
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = '';
			};
		}
	}, [asModal]);

	// Usar useAISummarize directo
	const { data, status, error: aiError, summarize, reset: resetAI } = useAISummarize({
		type: "key-points",
		format: "plain-text",
		length: "medium",
		outputLanguage: "es",
		streaming: true,
	});

	const availability =
		status === "initializing" || status === "downloading" ? "checking" :
		status === "idle" || status === "success" ? "available" : "unavailable";
	
	const isGenerating = isGeneratingLocal || status === "summarizing" || status === "initializing" || status === "downloading";
	const summary = data || "";

	const statusMessages: Record<string, string> = {
		initializing: "Inicializando...",
		downloading: "Descargando...",
		summarizing: "Generando...",
	};
	const getStatusMessage = statusMessages[status] || "Generando...";

	const { processError } = useAIErrorProcessor();

	// Estado para errores procesados por IA
	const [processedError, setProcessedError] = useState<string | null>(null);

	// Manejar errores de queries con IA
	useEffect(() => {
		const handleQueryError = async (err: unknown) => {
			if (!err) return;
			const errorObj = err instanceof Error ? err : new Error(String(err));
			const friendlyError = await processError(errorObj);
			setProcessedError(friendlyError);
		};

		if (currentError) handleQueryError(currentError);
	}, [currentError, processError]);

	const filteredLines = (() => {
		if (!currentLogs) return [];

		const trimmedLogs = currentLogs.trimEnd();
		const logGroups = groupLogs(trimmedLogs);

		// Filtrar por nivel de log si está seleccionado
		let groupsToProcess = logGroups;
		if (logLevelFilter !== "all") {
			groupsToProcess = logGroups.filter(group => {
				// Solo buscar el nivel de log en la primera línea del grupo
				const firstLine = group.split("\n")[0];
				const match = firstLine.match(logLevelPattern);
				if (!match) return false;
				const level = match[0].toUpperCase();
				if (logLevelFilter === "ERROR") {
					return level === "ERROR" || level === "ERR" || level === "FATAL";
				}
				if (logLevelFilter === "WARN") {
					return level === "WARN" || level === "WARNING";
				}
				return level === logLevelFilter;
			});
		}

		return groupsToProcess.flatMap(group => group.split("\n"));
	})();

	const matchCount = useMemo(() => {
		if (!filter || !filter.trim()) return 0;
		const escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(escaped, 'gi');
		const text = filteredLines.join('\n');
		return (text.match(regex) || []).length;
	}, [filteredLines, filter]);

	useEffect(() => {
		if (filter.trim()) {
			const found = xtermRef.current?.findNext(filter);
			setCurrentMatchIndex(found ? 0 : -1);
		} else {
			xtermRef.current?.clearSearch();
			setCurrentMatchIndex(0);
		}
	}, [filter]);

	function stripAnsiCodes(text: string): string {
		// eslint-disable-next-line no-control-regex
		return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
	}

	const handleCopy = async () => {
		const logsToCopy = stripAnsiCodes(filteredLines.join('\n'));
		if (!logsToCopy) return;
		await navigator.clipboard.writeText(logsToCopy);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleCopyAiSummary = async () => {
		if (!summary) return;
		await navigator.clipboard.writeText(summary);
		setAiSummaryCopied(true);
		setTimeout(() => setAiSummaryCopied(false), 2000);
	};

	const handleSummarizeWithAI = async () => {
		if (!currentLogs) return;

		const logsToSummarize = filteredLines.join('\n');
		const context = 'Analiza los logs SOLO para identificar problemas. Si los logs están en formato JSON, extrae el mensaje de error y el nivel (level). REGLAS ESTRICTAS: 1) NO repitas los logs completos o en JSON, 2) NO menciones configuración, rutas, startup, Swagger, mapeo de controladores, debug info, 3) Solo reporta ERRORES, WARNINGS, EXCEPCIONES, TIMEOUTS, FALLOS DE CONEXIÓN en lenguaje natural, 4) Compliance: secretos expuestos, credenciales en texto plano. ESTRUCTURA EXACTA (máximo 4 líneas, texto plano): * Errores críticos: [descripción en lenguaje natural o "ninguno"] * Warnings: [descripción en lenguaje natural o "ninguno"] * Compliance: [problemas o "ninguno"] * Estado general: HEALTHY/DEGRADED/CRITICAL. NO agregues secciones adicionales. Usa minúsculas en las etiquetas.';
		const textWithContext = `INSTRUCCIÓN: ${context}\n\n${logsToSummarize}`;
		const aiSummaryQueryKey = ['ai-summary', logsToSummarize, context];

		setIsGeneratingLocal(true);

		try {
			const cachedData = queryClient.getQueryData<string>(aiSummaryQueryKey);
			if (cachedData) return;

			await queryClient.fetchQuery({
				queryKey: aiSummaryQueryKey,
				queryFn: async () => {
					await summarize(textWithContext, context);
					return new Promise<string>((resolve) => {
						const checkData = () => {
							if (data) resolve(data);
							else setTimeout(checkData, 50);
						};
						checkData();
					});
				},
				staleTime: 5 * 60 * 1000,
				gcTime: 10 * 60 * 1000,
			});
		} catch (err) {
			console.error('[LogsViewer] Error generating summary:', err);
		} finally {
			setIsGeneratingLocal(false);
		}
		setProcessedError(null);
	};

	const handleRegenerateSummary = async () => {
		queryClient.removeQueries({ queryKey: ['ai-summary'] });
		resetAI();
		await handleSummarizeWithAI();
	};

	const headerExtra = (
		<div className="flex items-center gap-0">
			{!isLoading && logs && (
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-success bg-success/10 rounded-md cursor-default">
							<span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
							Live
						</span>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
							sideOffset={5}
						>
							Conexión en vivo activa
							<Tooltip.Arrow className="fill-popover" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			)}
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<button
						type="button"
						onClick={handleSummarizeWithAI}
						disabled={isGenerating || availability !== "available" || !currentLogs}
						className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-ai bg-ai/10 border border-ai/20 hover:bg-ai/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1"
					>
						{isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
						{isGenerating ? getStatusMessage : "Resumir"}
					</button>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
						sideOffset={5}
					>
						RESUMIR LOGS CON IA
						<Tooltip.Arrow className="fill-popover" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
			<div className="w-px h-6 bg-border mx-2" />
			<div className="flex items-center gap-2">
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<select
							value={logLevelFilter}
							onChange={(e) => setLogLevelFilter(e.target.value as "all" | "ERROR" | "WARN" | "INFO" | "DEBUG")}
							className="bg-muted/30 border border-border rounded-lg px-2 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1"
							aria-label="Filtrar por nivel de log"
						>
							<option value="all">Todos</option>
							<option value="ERROR">ERROR</option>
							<option value="WARN">WARN</option>
							<option value="INFO">INFO</option>
							<option value="DEBUG">DEBUG</option>
						</select>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
							sideOffset={5}
						>
							FILTRAR POR NIVEL DE LOG
							<Tooltip.Arrow className="fill-popover" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<div className="relative">
							<Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
							<input
								ref={searchInputRef}
								type="text"
								value={filter}
								onChange={(e) => {
									setFilter(e.target.value);
									setCurrentMatchIndex(0);
								}}
								placeholder="BUSCAR (CMD+F)"
								aria-label="Buscar logs"
								className="pl-7 pr-8 py-1 text-xs font-medium bg-muted/30 border border-border rounded-lg w-48 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1 placeholder:text-muted-foreground/70"
							/>
							{filter && (
								<Tooltip.Root delayDuration={0}>
									<Tooltip.Trigger asChild>
										<button
											type="button"
											onClick={() => {
												setFilter("");
												setCurrentMatchIndex(0);
												searchInputRef.current?.focus();
											}}
											className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted/30 rounded-full text-muted-foreground transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1"
											aria-label="Limpiar búsqueda"
										>
											<X className="w-3 h-3" />
										</button>
									</Tooltip.Trigger>
									<Tooltip.Portal>
										<Tooltip.Content
											className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
											sideOffset={5}
										>
											Limpiar búsqueda
											<Tooltip.Arrow className="fill-popover" />
										</Tooltip.Content>
									</Tooltip.Portal>
								</Tooltip.Root>
							)}
						</div>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
							sideOffset={5}
						>
							BUSCAR LOGS POR TEXTO
							<Tooltip.Arrow className="fill-popover" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>

				{filter.trim() !== "" && (
					<div className="flex items-center gap-0.5 border border-border rounded px-1.5 bg-muted h-8 ml-2">
						<span className="text-xs text-muted-foreground select-none font-mono min-w-[2.5rem] text-center">
							{matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : "0/0"}
						</span>
						<IconButton
							icon={<ChevronUp className="w-3.5 h-3.5" />}
							onClick={() => {
								const found = xtermRef.current?.findPrevious(filter);
								if (found && matchCount > 0) {
									setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
								}
							}}
							tooltip="Coincidencia anterior"
							disabled={matchCount === 0}
						/>
						<IconButton
							icon={<ChevronDown className="w-3.5 h-3.5" />}
							onClick={() => {
								const found = xtermRef.current?.findNext(filter);
								if (found && matchCount > 0) {
									setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
								}
							}}
							tooltip="Coincidencia siguiente"
							disabled={matchCount === 0}
						/>
					</div>
				)}

			</div>
			<div className="w-px h-6 bg-border mx-2" />
			<IconButton
				icon={autoScrollEnabled ? <Pause className="w-4 h-4 text-destructive" /> : <Play className="w-4 h-4" />}
				onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
				tooltip={autoScrollEnabled ? "Detener scroll automático (polling continúa)" : "Activar scroll automático"}
			/>
			<IconButton
				icon={copied ? <Check className="w-4 h-4 text-success" /> : <ClipboardCopy className="w-4 h-4" />}
				onClick={handleCopy}
				tooltip={copied ? "¡Copiado!" : "Copiar logs al portapapeles"}
			/>
			{asModal && (
				<IconButton
					icon={isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
					onClick={() => setIsExpanded(!isExpanded)}
					tooltip={isExpanded ? "Contraer tamaño" : "Expandir a pantalla completa"}
				/>
			)}
		</div>
	);

	const innerContent = (
		<div
			ref={containerRef}
			tabIndex={0}
			role="log"
			aria-label="Panel de logs"
			className="flex-1 min-h-0 flex flex-col bg-black p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none rounded-b-md"
		>
				{processedError && (
					<div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg sticky top-0 z-10 shrink-0">
						<div className="flex items-center justify-between gap-2 mb-2">
							<div className="flex items-center gap-2">
								<AlertCircle className="w-4 h-4 text-destructive" />
								<span className="text-destructive font-semibold text-sm">Error</span>
							</div>
							<button
								type="button"
								onClick={() => setProcessedError(null)}
								className="text-xs text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-offset-1"
								aria-label="Cerrar error"
							>
								<X className="w-3 h-3" />
							</button>
						</div>
						<p className="text-destructive/90 text-xs whitespace-pre-wrap">{processedError}</p>
					</div>
				)}
				<AISummaryCard
					summary={summary}
					isGenerating={isGenerating}
					error={aiError?.message || null}
					onRegenerate={handleRegenerateSummary}
					onCopy={handleCopyAiSummary}
					isCollapsed={isAiSummaryCollapsed}
					onToggleCollapse={() => setIsAiSummaryCollapsed(!isAiSummaryCollapsed)}
					isCopied={aiSummaryCopied}
					variant="compact"
				/>
				<div className="flex-1 min-h-0 relative mt-2">
					{currentIsLoading ? (
						<div className="flex items-center justify-center gap-2 h-full text-muted-foreground py-8">
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Cargando logs...</span>
						</div>
					) : !currentLogs ? (
						<span className="text-warning px-2 py-1 block">No hay logs disponibles</span>
					) : (
						<XTermLogs
							ref={xtermRef}
							logs={filteredLines.join('\n')}
							autoScroll={autoScrollEnabled}
							className="h-full"
						/>
					)}
				</div>
			</div>
	);

	if (asModal) {
		return (
			<BaseDialog
				open={true}
				onOpenChange={(open) => !open && onClose()}
				title={
					<div className="flex items-center gap-2">
					<Terminal className="w-4 h-4 text-primary" />
						{resources && resources.length > 0 ? (
							<select
								value={selectedResourceId || resources[0].id}
								onChange={(e) => onResourceChange?.(e.target.value)}
									className="bg-muted/30 border border-border rounded-lg px-2 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1"
								aria-label="Seleccionar recurso"
							>
								{resources.map((resource) => (
									<option key={resource.id} value={resource.id}>
										{resource.name}
									</option>
								))}
							</select>
						) : (
							<span>Logs</span>
						)}
					</div>
				}
				maxWidth={isExpanded ? "max-w-none" : "max-w-7xl"}
				maxHeight={isExpanded ? "max-h-screen" : "max-h-[90vh]"}
				className={cn(
					"!p-0",
					isExpanded ? "w-screen h-screen !max-h-screen !rounded-none border-none" : "w-[90vw] h-[90vh]"
				)}
				headerExtra={headerExtra}
			>
				<div className="flex flex-col flex-1 min-h-0">
					{innerContent}
				</div>
			</BaseDialog>
		);
	}

	return (
		<div className="bg-background rounded-lg shadow-lg w-full h-full max-h-[80vh] flex flex-col overflow-hidden">
			<div className="flex items-center justify-between gap-0 mb-2 px-4 pt-4 flex-shrink-0">
				<div className="flex items-center gap-2">
					<Terminal className="w-4 h-4 text-primary" />
					{resources && resources.length > 0 && (
						<select
							value={selectedResourceId || resources[0].id}
							onChange={(e) => onResourceChange?.(e.target.value)}
							className="bg-muted/30 border border-border rounded-lg px-2 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1"
							aria-label="Seleccionar recurso"
						>
							{resources.map((resource) => (
								<option key={resource.id} value={resource.id}>
									{resource.name}
								</option>
							))}
						</select>
					)}
				</div>
				{headerExtra}
			</div>
			{innerContent}
		</div>
	);
}
