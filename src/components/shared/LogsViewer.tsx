import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, X, ClipboardCopy, Check, Sparkles, AlertCircle, Pause, Play, Terminal } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { LazyRender, useAISummarize } from "@galiprandi/react-tools";
import { useAIErrorProcessor } from "@/hooks/useAIErrorProcessor";
import { AISummaryCard } from "@/components/AISummaryCard";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { highlightLogLine, groupLogs, logLevelPattern } from "./logUtils";
import { IconButton } from "./IconButton";

export interface LogsViewerProps {
	queryFn: () => Promise<string>;
	onClose: () => void;
	asModal?: boolean;
	resources?: { id: string; name: string; type: string }[];
	selectedResourceId?: string;
	onResourceChange?: (resourceId: string) => void;
}

export function LogsViewer({
	queryFn,
	onClose,
	asModal = true,
	resources,
	selectedResourceId,
	onResourceChange,
}: LogsViewerProps) {
	const queryClient = useQueryClient();

	const { data: logs, isLoading, error } = useQuery({
		queryKey: ['logs', selectedResourceId],
		queryFn,
		enabled: !!queryFn,
		refetchInterval: 3000,
	});

	const [filter, setFilter] = useState("");
	const [logLevelFilter, setLogLevelFilter] = useState<"all" | "ERROR" | "WARN" | "INFO" | "DEBUG">("all");
	const [copied, setCopied] = useState(false);
	const [aiSummaryCopied, setAiSummaryCopied] = useState(false);
	const [isAiSummaryCollapsed, setIsAiSummaryCollapsed] = useState(false);
	const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
	const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
	const logsContainerRef = useRef<HTMLDivElement>(null);
	const preRef = useRef<HTMLPreElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const currentLogs = logs || "";
	const currentError = error;
	const currentIsLoading = isLoading;

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

	// Estado para errores procesados por AI
	const [processedError, setProcessedError] = useState<string | null>(null);

	// Manejar errores de queries con AI
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
				const match = group.match(logLevelPattern);
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

		if (filter === "") {
			return groupsToProcess.flatMap(group => group.split("\n"));
		}

		const filterLower = filter.toLowerCase();

		// Filtrar grupos que coinciden con el filtro
		const matchingGroups = groupsToProcess.filter(group =>
			group.toLowerCase().includes(filterLower)
		);

		// Convertir grupos filtrados de vuelta a líneas individuales
		return matchingGroups.flatMap(group => group.split("\n"));
	})();

	// ResizeObserver on <pre> to scroll when LazyRender content actually expands
	useEffect(() => {
		const pre = preRef.current;
		const container = logsContainerRef.current;
		if (!pre || !container) return;

		const observer = new ResizeObserver(() => {
			if (autoScrollEnabled) {
				container.scrollTop = container.scrollHeight;
			}
		});
		observer.observe(pre);
		return () => observer.disconnect();
	}, [autoScrollEnabled]);

	// Detect manual scroll and disable auto-scroll
	useEffect(() => {
		const container = logsContainerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
			if (!isAtBottom && autoScrollEnabled) {
				setAutoScrollEnabled(false);
			}
		};

		container.addEventListener('scroll', handleScroll);
		return () => container.removeEventListener('scroll', handleScroll);
	}, [autoScrollEnabled]);


	const handleCopy = async () => {
		const logsToCopy = filteredLines.join('\n');
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
		<Tooltip.Provider>
		<div className="flex items-center gap-0">
			{!isLoading && logs && (
				<span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded">
					<span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
					Live
				</span>
			)}
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<button
						type="button"
						onClick={handleSummarizeWithAI}
						disabled={isGenerating || availability !== "available" || !currentLogs}
						className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
					>
						{isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
						{isGenerating ? getStatusMessage : "Resumir"}
					</button>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
						sideOffset={5}
					>
						Resumir logs con IA
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
							className="bg-background border rounded px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
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
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
							sideOffset={5}
						>
							Filtrar por nivel de log
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
								onChange={(e) => setFilter(e.target.value)}
								placeholder="Buscar (Cmd+F)"
								aria-label="Buscar logs"
								className="pl-7 pr-2 py-1 text-sm bg-background border rounded w-48 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
							/>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
							sideOffset={5}
						>
							Filtrar logs por texto
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</div>
			<div className="w-px h-6 bg-border mx-2" />
			<IconButton
				icon={autoScrollEnabled ? <Pause className="w-4 h-4 text-red-500" /> : <Play className="w-4 h-4" />}
				onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
				tooltip={autoScrollEnabled ? "Detener auto-scroll" : "Activar auto-scroll"}
			/>
			<IconButton
				icon={copied ? <Check className="w-4 h-4 text-green-500" /> : <ClipboardCopy className="w-4 h-4" />}
				onClick={handleCopy}
				tooltip={copied ? "¡Copiado!" : "Copiar logs al portapapeles"}
			/>
		</div>
		</Tooltip.Provider>
	);

	const innerContent = (
		<div
			ref={logsContainerRef}
			tabIndex={0}
			role="log"
			aria-label="Panel de logs"
			className="flex-1 min-h-0 overflow-auto bg-black text-green-400 p-4 font-mono text-xs p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none rounded-md"
		>
				{processedError && (
					<div className="mb-4 p-3 bg-red-900 border border-red-500/30 rounded-lg sticky top-0 z-10">
						<div className="flex items-center justify-between gap-2 mb-2">
							<div className="flex items-center gap-2">
								<AlertCircle className="w-4 h-4 text-red-400" />
								<span className="text-red-300 font-semibold text-sm">Error</span>
							</div>
							<button
								type="button"
								onClick={() => setProcessedError(null)}
								className="text-xs text-red-300 hover:text-red-200 hover:bg-red-800/30 rounded px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-offset-1"
								aria-label="Cerrar error"
							>
								<X className="w-3 h-3" />
							</button>
						</div>
						<p className="text-red-100 text-xs whitespace-pre-wrap">{processedError}</p>
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
				<pre ref={preRef} className="whitespace-pre-wrap break-words">
					{currentIsLoading ? (
						<div className="flex items-center justify-center gap-2 h-full text-gray-400">
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Cargando logs...</span>
						</div>
					) : !currentLogs ? (
						<span className="text-yellow-500">No hay logs disponibles</span>
					) : filteredLines.length > 0 ? (
						filteredLines.map((line: string, idx: number) => (
							<LazyRender key={idx} placeholder={<span/>}>{highlightLogLine(line, filter)}</LazyRender>
						))
					) : (filter || logLevelFilter !== "all") ? (
						<span className="text-gray-500">No se encontraron logs que coincidan con los filtros.</span>
					) : (
						currentLogs || "No logs disponibles"
					)}
				</pre>
			</div>
	);

	if (asModal) {
		return (
			<BaseDialog
				open={true}
				onOpenChange={(open) => !open && onClose()}
				title={
					<div className="flex items-center gap-2">
						<Terminal className="w-4 h-4 text-blue-600" />
						{resources && resources.length > 0 ? (
							<select
								value={selectedResourceId || resources[0].id}
								onChange={(e) => onResourceChange?.(e.target.value)}
								className="bg-background border rounded px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm font-normal"
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
				maxWidth="max-w-[1800px]"
				className="w-[95vw] h-[95vh] !p-0"
				headerExtra={headerExtra}
			>
				<div className="flex flex-col flex-1 min-h-0 p-4 pt-0">
					{innerContent}
				</div>
			</BaseDialog>
		);
	}

	return (
		<div className="bg-background rounded-lg shadow-lg w-full h-full max-h-[80vh] flex flex-col overflow-hidden">
			<div className="flex items-center justify-between gap-0 mb-2 px-4 pt-4 flex-shrink-0">
				<div className="flex items-center gap-2">
					<Terminal className="w-4 h-4 text-blue-600" />
					{resources && resources.length > 0 && (
						<select
							value={selectedResourceId || resources[0].id}
							onChange={(e) => onResourceChange?.(e.target.value)}
							className="bg-background border rounded px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
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
