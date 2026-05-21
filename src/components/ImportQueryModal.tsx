import { useState, useMemo } from 'react';
import { Send, Loader2, Copy, AlertTriangle } from 'lucide-react';
import { BaseDialog } from '@/components/ui/BaseDialog';
import { parseCurlCommand, formatJSON, minifyJSON, type ParsedCurl } from '@/utils/curlParser';
import type { QueryRecord } from '@/types/queries';
import { executeCurlCommand } from '@/api/curl';
import { useQueriesHistory } from '@/hooks/useQueriesHistory';

interface ImportQueryModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImport?: (curl: string) => void;
	initialQuery?: QueryRecord;
}

interface CurlResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string;
	responseTime: number;
}

const MAX_HEADERS_DISPLAY = 7;

function formatTimeAgo(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return 'ahora mismo';
	if (diffMins < 60) return `hace ${diffMins} min`;
	if (diffHours < 24) return `hace ${diffHours} h`;
	return `hace ${diffDays} días`;
}

export function ImportQueryModal({ open, onOpenChange, onImport, initialQuery }: ImportQueryModalProps) {
	const [curlInput, setCurlInput] = useState(() => initialQuery?.curl || '');
	const [manualParsedQuery, setManualParsedQuery] = useState<ParsedCurl | null>(null);
	const [isExecuting, setIsExecuting] = useState(false);
	const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
	const [headersExpanded, setHeadersExpanded] = useState(false);
	const [bodySearchQuery, setBodySearchQuery] = useState('');

	const { addQueryRecord } = useQueriesHistory();

	// Derive isEditMode from initialQuery and open
	const isEditMode = !!(initialQuery && open);

	// Derive initialParsedQuery from initialQuery when in edit mode
	const initialParsedQuery = useMemo(() => {
		if (!initialQuery || !open) return null;
		try {
			const parsed = parseCurlCommand(initialQuery.curl);
			return { ...parsed, body: formatJSON(parsed.body) };
		} catch {
			return null;
		}
	}, [initialQuery, open]);

	// Use manualParsedQuery in edit mode (if user made changes), otherwise use initialParsedQuery
	// In non-edit mode, use manualParsedQuery from curl input parsing
	const effectiveManualParsedQuery = isEditMode ? (manualParsedQuery || initialParsedQuery) : manualParsedQuery;

	// Derive parsedQuery from curlInput when not in edit mode, otherwise use effectiveManualParsedQuery
	const parsedQuery = useMemo(() => {
		if (isEditMode) return effectiveManualParsedQuery;
		if (!curlInput.trim()) return null;
		try {
			const parsed = parseCurlCommand(curlInput);
			return { ...parsed, body: formatJSON(parsed.body) };
		} catch {
			return null;
		}
	}, [curlInput, isEditMode, effectiveManualParsedQuery]);

	// Derive response from initialQuery or execution result
	const [executedResponse, setExecutedResponse] = useState<CurlResponse | null>(null);
	const response = initialQuery?.lastResponse || executedResponse;

	const handleExecute = async () => {
		if (!parsedQuery) return;

		setIsExecuting(true);
		setExecutedResponse(null);

		try {
			const startTime = Date.now();

			// Build curl command from parsed query
			const headers = Object.entries(parsedQuery.headers)
				.map(([key, value]) => `-H "${key}: ${value}"`)
				.join(' ');

			// Minify JSON body before sending
			const bodyToSend = parsedQuery.body ? minifyJSON(parsedQuery.body) : '';
			const data = bodyToSend ? `-d '${bodyToSend}'` : '';
			// Use single quotes for URL to preserve special characters without escaping
			const command = `-X ${parsedQuery.method} '${parsedQuery.url}' ${headers} ${data}`.trim();

			const result = await executeCurlCommand(command);
			const responseTime = Date.now() - startTime;

			// Parse curl response (with -i flag, headers come first)
			const headerEnd = result.indexOf('\r\n\r\n');
			const headersText = headerEnd !== -1 ? result.slice(0, headerEnd) : '';
			const bodyText = headerEnd !== -1 ? result.slice(headerEnd + 4) : result;

			// Extract status line
			const statusMatch = headersText.match(/HTTP\/[\d.]+\s+(\d+)\s+(.+)/);
			const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
			const statusText = statusMatch ? statusMatch[2] : '';

			// Parse headers
			const headersObj: Record<string, string> = {};
			headersText.split('\r\n').forEach((line) => {
				const colonIndex = line.indexOf(':');
				if (colonIndex > -1) {
					const key = line.slice(0, colonIndex).trim();
					const value = line.slice(colonIndex + 1).trim();
					headersObj[key] = value;
				}
			});

			setExecutedResponse({
				status,
				statusText,
				headers: headersObj,
				body: bodyText,
				responseTime,
			});

			// Save to history with response after successful execution
			addQueryRecord({
				curl: curlInput,
				lastResponse: {
					status,
					statusText,
					headers: headersObj,
					body: bodyText,
					responseTime,
				},
			});
		} catch (error) {
			console.error('Failed to execute curl:', error);
			setExecutedResponse({
				status: 0,
				statusText: 'Error',
				headers: {},
				body: error instanceof Error ? error.message : 'Unknown error',
				responseTime: 0,
			});
		} finally {
			setIsExecuting(false);
		}
	};

	const handleImport = () => {
		if (curlInput && onImport) {
			onImport(curlInput);
			onOpenChange(false);
		}
	};

	const handleCopyResponse = () => {
		if (response) {
			navigator.clipboard.writeText(response.body);
		}
	};

	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title={<><Send className="w-5 h-5" /> {isEditMode ? 'Editar Query' : 'Importar cURL'}</>}
			description="Importa o edita un comando cURL para ejecutarlo"
			maxWidth="max-w-6xl"
			maxHeight="max-h-[90vh]"
		>
			<div className="flex-1 overflow-hidden flex flex-col">
				{!isEditMode && (
					<div className="p-4 border-b">
						<label className="text-sm font-medium block mb-2">Pega el comando cURL</label>
						<textarea
							value={curlInput}
							onChange={(e) => setCurlInput(e.target.value)}
							placeholder="curl -X POST https://api.example.com/users -H Content-Type: application/json -d data"
							className={`w-full h-32 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono ${
								parsedQuery?.isTokenExpired ? 'border-destructive' : ''
							}`}
						/>
						{parsedQuery?.isTokenExpired && (
							<p className="mt-1 text-xs text-destructive">⚠️ Token de autenticación vencido</p>
						)}
					</div>
				)}

				{parsedQuery && (
					<div className="flex-1 flex overflow-hidden">
						{/* Left side: Editable form */}
						<div className="w-1/2 p-4 border-r overflow-y-auto">
							<div className="space-y-4">
								<div className="flex gap-2">
									<div className="w-24">
										<label className="text-xs font-medium block mb-1.5">Método</label>
										<select
											value={parsedQuery.method}
											onChange={(e) => setManualParsedQuery({ ...parsedQuery, method: e.target.value })}
											className="w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
										>
											{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
												<option key={m} value={m}>{m}</option>
											))}
										</select>
									</div>
									<div className="flex-1">
										<label className="text-xs font-medium block mb-1.5">URL</label>
										<input
											type="text"
											value={parsedQuery.url}
											onChange={(e) => setManualParsedQuery({ ...parsedQuery, url: e.target.value })}
											className="w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
										/>
									</div>
									<div className="flex items-end">
										<button
											type="button"
											onClick={handleExecute}
											disabled={isExecuting}
											className="flex items-center justify-center gap-2 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
										>
											{isExecuting ? (
												<>
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
													Ejecutando...
												</>
											) : (
												<>
													<Send className="w-3.5 h-3.5" />
													Send
												</>
											)}
										</button>
									</div>
								</div>

								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label className="text-xs font-medium">Headers</label>
										<button
											type="button"
											onClick={() => setManualParsedQuery({ ...parsedQuery, headers: { ...parsedQuery.headers, '': '' } })}
											className="text-xs text-primary hover:underline"
										>
											+ Agregar
										</button>
									</div>
									<div className="space-y-2">
										{Object.entries(parsedQuery.headers)
											.slice(0, headersExpanded ? undefined : MAX_HEADERS_DISPLAY)
											.map(([key, value]) => (
												<div key={key} className="grid grid-cols-[3fr_7fr_auto] gap-4 items-center">
													<input
														type="text"
														value={key}
														onChange={(e) => {
															const newHeaders = { ...parsedQuery.headers };
															delete newHeaders[key];
															newHeaders[e.target.value] = value;
															setManualParsedQuery({ ...parsedQuery, headers: newHeaders });
														}}
														placeholder="Header name"
														className="w-full px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
													/>
													{key.toLowerCase() === 'authorization' ? (
														<div className="relative">
															<input
																type="text"
																value={value}
																onChange={(e) => setManualParsedQuery({
																	...parsedQuery,
																	headers: { ...parsedQuery.headers, [key]: e.target.value }
																})}
																placeholder="Value"
																className={`w-full px-2 py-1 pr-8 text-xs border rounded-md focus:outline-none focus:ring-2 ${
																	parsedQuery.isTokenExpired
																		? 'bg-warning/10 border-warning text-warning-foreground'
																		: 'focus:ring-primary border'
																}`}
															/>
															<AlertTriangle className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warning" />
														</div>
													) : (
														<input
															type="text"
															value={value}
															onChange={(e) => setManualParsedQuery({
																...parsedQuery,
																headers: { ...parsedQuery.headers, [key]: e.target.value }
															})}
															placeholder="Value"
															className="w-full px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
														/>
													)}
													<button
														type="button"
														onClick={() => {
															const newHeaders = { ...parsedQuery.headers };
															delete newHeaders[key];
															setManualParsedQuery({ ...parsedQuery, headers: newHeaders });
														}}
														className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded"
													>
														×
													</button>
												</div>
											))}
										{Object.keys(parsedQuery.headers).length > MAX_HEADERS_DISPLAY && (
											<button
												type="button"
												onClick={() => setHeadersExpanded(!headersExpanded)}
												className="text-xs text-primary hover:underline"
											>
												{headersExpanded ? 'Mostrar menos' : `Mostrar ${Object.keys(parsedQuery.headers).length - MAX_HEADERS_DISPLAY} más`}
											</button>
										)}
									</div>
								</div>

								<div>
									<label className="text-xs font-medium block mb-1.5">Body</label>
									<textarea
										value={parsedQuery.body}
										onChange={(e) => setManualParsedQuery({ ...parsedQuery, body: e.target.value })}
										placeholder='{"key": "value"}'
										className="w-full h-60 px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
									/>
								</div>

								<div className="flex gap-2 pt-2">
									{!isEditMode && onImport && (
										<button
											type="button"
											onClick={handleImport}
											className="flex items-center justify-center gap-2 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
										>
											Guardar en historial
										</button>
									)}
								</div>
							</div>
						</div>

						{/* Right side: Response panel */}
						<div className="w-1/2 p-4 overflow-hidden flex flex-col">
							{response ? (
								<>
				

									{/* Tabs */}
									<div className="flex gap-2 mb-3 items-center">
										<button
											type="button"
											onClick={() => setActiveTab('headers')}
											className={`px-3 py-1 text-xs rounded-md transition-colors ${
												activeTab === 'headers'
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-muted-foreground hover:bg-accent'
											}`}
										>
											Headers
										</button>
										<button
											type="button"
											onClick={() => setActiveTab('body')}
											className={`px-3 py-1 text-xs rounded-md transition-colors ${
												activeTab === 'body'
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-muted-foreground hover:bg-accent'
											}`}
										>
											Body
										</button>
										<input
											type="text"
											value={bodySearchQuery}
											onChange={(e) => setBodySearchQuery(e.target.value)}
											placeholder="Buscar en body..."
											className="ml-auto px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-48"
										/>
									</div>

									{/* Response content */}
									<div className="flex-1 overflow-auto bg-muted/50 rounded-md p-3 relative">
										{activeTab === 'body' ? (
											<>
											<button
												type="button"
												onClick={handleCopyResponse}
												className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
												title="Copiar respuesta"
											>
												<Copy className="w-4 h-4" />
											</button>
											<pre className="text-xs font-mono whitespace-pre-wrap break-all">
												{response.body
													? bodySearchQuery
														? formatJSON(response.body)
																.split('\n')
																.filter((line) =>
																	line.toLowerCase().includes(bodySearchQuery.toLowerCase()),
																)
																.join('\n') || '(Sin coincidencias)'
														: formatJSON(response.body)
													: '(Sin respuesta)'}
											</pre>
											</>
										) : (
											<div className="text-xs font-mono space-y-1">
												{Object.entries(response.headers).map(([key, value]) => (
													<div key={key}>
														<span className="font-semibold">{key}:</span> {value}
													</div>
												))}
											</div>
										)}
									</div>

									{/* Response footer with timing info */}
									
									<div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
										<span className={`px-2 py-1 rounded text-xs font-semibold ${
												response.status >= 200 && response.status < 300
													? 'bg-green-100 text-green-700'
													: response.status >= 400
														? 'bg-red-100 text-red-700'
														: 'bg-yellow-100 text-yellow-700'
											}`} title={initialQuery?.lastSent ? formatTimeAgo(initialQuery.lastSent) : new Date().toLocaleString()}>
												{response.status} {response.statusText}
											</span>
										<span>{response.responseTime}ms</span>
									</div>
								</>
							) : (
								<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
									Ejecuta la query para ver la respuesta
								</div>
							)}
						</div>
					</div>
				)}

				{!parsedQuery && curlInput && (
					<div className="p-4 text-center text-sm text-muted-foreground">
						Pega un comando cURL válido para comenzar
					</div>
				)}
			</div>
		</BaseDialog>
	);
}
