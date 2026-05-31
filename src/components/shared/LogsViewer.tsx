import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, X, ClipboardCopy, Check, Sparkles, AlertCircle, Pause, Play, Terminal, ChevronUp, ChevronDown, WrapText, Hash, Highlighter, Maximize2, Minimize2 } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { LazyRender, useAISummarize } from "@galiprandi/react-tools";
import { useAIErrorProcessor } from "@/hooks/useAIErrorProcessor";
import { useLogsAccumulator } from "@/hooks/useLogsAccumulator";
import { AISummaryCard } from "@/components/AISummaryCard";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { highlightLogLine, groupLogs, logLevelPattern, stripAnsiCodes } from "./logUtils";
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

	const [filter, setFilter] = useState("");
	const [logLevelFilter, setLogLevelFilter] = useState<"all" | "ERROR" | "WARN" | "INFO" | "DEBUG">("all");
	const [copied, setCopied] = useState(false);
	const [aiSummaryCopied, setAiSummaryCopied] = useState(false);
	const [isAiSummaryCollapsed, setIsAiSummaryCollapsed] = useState(false);
	const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
	const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
	const autoScrollEnabledRef = useRef(autoScrollEnabled);
	const containerRef = useRef<HTMLDivElement>(null);
	const preRef = useRef<HTMLPreElement>(null);

	const [wordWrap, setWordWrap] = useState(() => {
		try {
			const saved = localStorage.getItem("release_hub_logs_word_wrap");
			return saved !== null ? JSON.parse(saved) : false;
		} catch {
			return false;
		}
	});
	const [showLineNumbers, setShowLineNumbers] = useState(() => {
		try {
			const saved = localStorage.getItem("release_hub_logs_line_numbers");
			return saved !== null ? JSON.parse(saved) : false;
		} catch {
			return false;
		}
	});
	const [customHighlight, setCustomHighlight] = useState("");
	const [showCustomHighlight, setShowCustomHighlight] = useState(false);
	const [isExpanded, setIsExpanded] = useState(() => {
		try {
			const saved = localStorage.getItem("release_hub_logs_expanded");
			return saved !== null ? JSON.parse(saved) : false;
		} catch {
			return false;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem("release_hub_logs_word_wrap", JSON.stringify(wordWrap));
		} catch (e) {
			console.error("Error saving wordWrap to localStorage:", e);
		}
	}, [wordWrap]);

	useEffect(() => {
		try {
			localStorage.setItem("release_hub_logs_line_numbers", JSON.stringify(showLineNumbers));
		} catch (e) {
			console.error("Error saving showLineNumbers to localStorage:", e);
		}
	}, [showLineNumbers]);

	useEffect(() => {
		try {
			localStorage.setItem("release_hub_logs_expanded", JSON.stringify(isExpanded));
		} catch (e) {
			console.error("Error saving isExpanded to localStorage:", e);
		}
	}, [isExpanded]);
	
	const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

	const {
		data: lineExplanationData,
		status: lineExplanationStatus,
		error: lineAIError,
		summarize: summarizeLine,
		reset: resetLineAI
	} = useAISummarize({
		type: "teaser",
		format: "plain-text",
		length: "short",
		outputLanguage: "es",
	});

	const [explainingLineIndex, setExplainingLineIndex] = useState<number | null>(null);

	const handleExplainLine = useCallback(async (idx: number, lineText: string) => {
		setExplainingLineIndex(idx);
		resetLineAI();
		
		const cleanLine = stripAnsiCodes(lineText);
		const prompt = `Analiza esta línea de error/advertencia de log de forma concisa y amigable. Explica qué significa el problema y cómo resolverlo en 1 o 2 frases cortas.
Log: ${cleanLine}`;
		
		try {
			await summarizeLine(prompt, "Eres un asistente de depuración técnico.");
		} catch (err) {
			console.error("Error explaining line:", err);
		}
	}, [summarizeLine, resetLineAI]);

	const searchInputRef = useRef<HTMLInputElement>(null);

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

		return groupsToProcess.flatMap(group => group.split("\n"));
	})();

	const matchingLineIndices = useMemo(() => {
		if (!filter || !filter.trim()) return [];
		const filterLower = filter.toLowerCase();
		const indices: number[] = [];
		filteredLines.forEach((line, idx) => {
			if (line.toLowerCase().includes(filterLower)) {
				indices.push(idx);
			}
		});
		return indices;
	}, [filteredLines, filter]);

	const scrollToMatch = useCallback((matchIdx: number) => {
		const lineIdx = matchingLineIndices[matchIdx];
		if (lineIdx === undefined || !containerRef.current) return;

		setAutoScrollEnabled(false);

		const container = containerRef.current;
		setTimeout(() => {
			const element = container.querySelector(`[data-line-idx="${lineIdx}"]`);
			if (element && typeof element.scrollIntoView === "function") {
				element.scrollIntoView({ block: "center", behavior: "smooth" });
			}
		}, 50);
	}, [matchingLineIndices]);

	const scrollToBottom = useCallback(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, []);

	// ResizeObserver on <pre> to scroll when LazyRender content actually expands
	useEffect(() => {
		if (!preRef.current || !containerRef.current) return;

		const pre = preRef.current;
		const observer = new ResizeObserver(() => {
			if (autoScrollEnabledRef.current) {
				scrollToBottom();
			}
		});
		observer.observe(pre);
		return () => observer.disconnect();
	}, [scrollToBottom]);

	// Detect manual scroll and disable auto-scroll
	useEffect(() => {
		if (!containerRef.current) return;

		const container = containerRef.current;
		const handleScroll = () => {
			// Disable auto-scroll if user scrolled away from the bottom.
			// We use a threshold of 10px to account for subpixel rounding.
			const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
			if (!isAtBottom && autoScrollEnabledRef.current) {
				setAutoScrollEnabled(false);
			}
		};
		container.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			container.removeEventListener('scroll', handleScroll);
		};
	}, []);

	// Scroll to bottom immediately when auto-scroll is enabled
	useEffect(() => {
		if (autoScrollEnabled) {
			scrollToBottom();
		}
	}, [autoScrollEnabled, scrollToBottom]);


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
				<span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-success bg-success/10 rounded">
					<span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
					Live
				</span>
			)}
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<button
						type="button"
						onClick={handleSummarizeWithAI}
						disabled={isGenerating || availability !== "available" || !currentLogs}
						className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-ai hover:bg-ai/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
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
								onChange={(e) => {
									setFilter(e.target.value);
									setCurrentMatchIndex(0);
								}}
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
							Buscar logs por texto
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>

				{/* Match Navigation (Iconos compactos) */}
				{filter.trim() !== "" && (
					<div className="flex items-center gap-0.5 border border-border rounded px-1.5 bg-muted h-8 ml-2">
						<span className="text-[10px] text-muted-foreground select-none font-mono min-w-[2.5rem] text-center">
							{matchingLineIndices.length > 0 ? `${currentMatchIndex + 1}/${matchingLineIndices.length}` : "0/0"}
						</span>
						<IconButton
							icon={<ChevronUp className="w-3.5 h-3.5" />}
							onClick={() => {
								setCurrentMatchIndex((prev) => {
									const next = matchingLineIndices.length > 0 ? (prev - 1 + matchingLineIndices.length) % matchingLineIndices.length : 0;
									scrollToMatch(next);
									return next;
								});
							}}
							tooltip="Coincidencia anterior"
							disabled={matchingLineIndices.length === 0}
						/>
						<IconButton
							icon={<ChevronDown className="w-3.5 h-3.5" />}
							onClick={() => {
								setCurrentMatchIndex((prev) => {
									const next = matchingLineIndices.length > 0 ? (prev + 1) % matchingLineIndices.length : 0;
									scrollToMatch(next);
									return next;
								});
							}}
							tooltip="Coincidencia siguiente"
							disabled={matchingLineIndices.length === 0}
						/>
					</div>
				)}

				<div className="w-px h-6 bg-border mx-2" />

				{/* Highlighter Personalizado (Icono compacto) */}
				<div className="flex items-center gap-1">
					<IconButton
						icon={<Highlighter className="w-4 h-4" />}
						onClick={() => {
							setShowCustomHighlight(!showCustomHighlight);
							if (showCustomHighlight) setCustomHighlight("");
						}}
						active={showCustomHighlight || !!customHighlight}
						tooltip="Resaltado personalizado"
					/>
					{showCustomHighlight && (
						<input
							type="text"
							placeholder="Resaltar..."
							value={customHighlight}
							onChange={(e) => setCustomHighlight(e.target.value)}
							className="h-8 w-24 bg-muted border border-border text-xs px-2 rounded text-foreground placeholder-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
							aria-label="Término para resaltar"
						/>
					)}
				</div>

				<IconButton
					icon={<WrapText className="w-4 h-4" />}
					onClick={() => setWordWrap(!wordWrap)}
					active={wordWrap}
					tooltip="Ajuste de línea"
				/>

				<IconButton
					icon={<Hash className="w-4 h-4" />}
					onClick={() => setShowLineNumbers(!showLineNumbers)}
					active={showLineNumbers}
					tooltip="Mostrar números de línea"
				/>
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
		</Tooltip.Provider>
	);

	const innerContent = (
		<div
			ref={containerRef}
			tabIndex={0}
			role="log"
			aria-label="Panel de logs"
			className="flex-1 min-h-0 overflow-auto bg-black text-success font-mono text-xs p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none rounded-b-md"
		>
				{processedError && (
					<div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg sticky top-0 z-10">
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
				<pre 
					ref={preRef} 
					className={cn(
						"min-w-0 flex-1 font-mono text-xs text-success select-text",
						wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
					)}
				>
					{currentIsLoading ? (
						<div className="flex items-center justify-center gap-2 h-full text-muted-foreground py-8">
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Cargando logs...</span>
						</div>
					) : !currentLogs ? (
						<span className="text-warning px-2 py-1 block">No hay logs disponibles</span>
					) : filteredLines.length > 0 ? (
						filteredLines.map((line: string, idx: number) => {
							const isCurrentMatch = matchingLineIndices.includes(idx) && matchingLineIndices[currentMatchIndex] === idx;
							
							const hasAiExplanation = (() => {
								const cleanLine = stripAnsiCodes(line).toUpperCase();
								return cleanLine.includes("ERROR") || cleanLine.includes("ERR ") || cleanLine.includes("FATAL") || cleanLine.includes("WARN");
							})();

							return (
								<div 
									key={idx}
									data-line-idx={idx}
									className={cn(
										"group flex items-start gap-2 py-0.5 px-2 rounded hover:bg-muted transition-colors duration-150 relative min-w-0 w-full",
										isCurrentMatch ? "bg-warning/20 border-l-2 border-warning" : ""
									)}
								>
									{/* Line Number Gutter */}
									{showLineNumbers && (
										<span className="text-muted-foreground/60 text-[10px] select-none text-right min-w-[2rem] pr-2 font-mono flex-shrink-0 border-r border-border mr-1">
											{idx + 1}
										</span>
									)}

									{/* Log Text Content */}
									<div className="flex-1 min-w-0 font-mono">
										<LazyRender placeholder={<span className="block h-4"/>}>
											{highlightLogLine(line, filter, customHighlight)}
										</LazyRender>

										{/* AI Explanation Sub-Box */}
										{explainingLineIndex === idx && (
											<div className="mt-1.5 p-2 bg-muted border border-border rounded-md text-xs text-muted-foreground font-sans relative max-w-2xl shadow-lg z-10 animate-in fade-in slide-in-from-top-1">
												<div className="flex items-center justify-between gap-2 mb-1.5 font-semibold text-muted-foreground">
													<div className="flex items-center gap-1.5">
														<Sparkles className="w-3.5 h-3.5 text-warning animate-pulse" />
														<span>Explicación del Error (IA)</span>
													</div>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setExplainingLineIndex(null);
															resetLineAI();
														}}
														className="text-muted-foreground hover:text-foreground rounded transition-colors focus-visible:outline-none"
														aria-label="Cerrar explicación"
													>
														<X className="w-3 h-3" />
													</button>
												</div>
												{lineExplanationStatus === "summarizing" ? (
													<div className="flex items-center gap-1.5 text-muted-foreground italic">
														<Loader2 className="w-3.5 h-3.5 animate-spin text-warning" />
														<span>Analizando error con IA local...</span>
													</div>
												) : lineExplanationStatus === "error" || lineAIError ? (
													<span className="text-destructive">Error al consultar el modelo de IA local: {lineAIError?.message || "Servicio no disponible"}</span>
												) : lineExplanationData ? (
													<span className="whitespace-pre-wrap">{lineExplanationData}</span>
												) : (
													<span className="text-muted-foreground">Preparando explicación...</span>
												)}
											</div>
										)}
									</div>

									{/* Hover Action Button (Sparkles to explain with AI) */}
									{hasAiExplanation && explainingLineIndex !== idx && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleExplainLine(idx, line);
											}}
											className="opacity-0 group-hover:opacity-100 absolute right-2 top-0.5 p-1 bg-muted text-warning hover:text-warning/80 rounded border border-border shadow-md transition-opacity duration-150 z-10"
											title="Explicar error con IA"
											aria-label="Explicar error con IA"
										>
											<Sparkles className="w-3 h-3" />
										</button>
									)}
								</div>
							);
						})
					) : (filter || logLevelFilter !== "all") ? (
						<span className="text-muted-foreground px-2 py-1 block">No se encontraron logs que coincidan con los filtros.</span>
					) : (
						<span className="px-2 py-1 block">{currentLogs || "No logs disponibles"}</span>
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
					<Terminal className="w-4 h-4 text-primary" />
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
