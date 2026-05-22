import { useState, useEffect,  type Dispatch, type SetStateAction } from 'react';
import { Send, Copy, AlertTriangle, SendHorizontal, Loader2, Plus, X } from 'lucide-react';
import { BaseDialog } from '@/components/ui/BaseDialog';
import { parseCurlCommand, formatJSON, minifyJSON } from '@/utils/curlParser';
import type { QueryRecord } from '@/types/queries';
import { executeCurlCommand } from '@/api/curl';
import { useFetcherHistory } from '@/hooks/useFetcherHistory';
import DayJS from '@/lib/dayjs';

interface ImportQueryModalProps {
	query?: QueryRecord;
	setQuery: Dispatch<SetStateAction<QueryRecord | undefined>>
	onClose?: () => void
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

export function ImportQueryModal({ query, setQuery, onClose }: ImportQueryModalProps) {
	const [curlInput, setCurlInput] = useState(query?.curl || '');
	const [isExecuting, setIsExecuting] = useState(false);
	const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
	const [headersExpanded, setHeadersExpanded] = useState(false);
	const [bodySearchQuery, setBodySearchQuery] = useState('');

	const { addQueryRecord } = useFetcherHistory();
	const curl = query?.curl || null;

	// Memorize the initial curl value to keep modal open during execution
	const [initialCurl, setInitialCurl] = useState(curl);
	const parsed = curlInput ? parseCurlCommand(curlInput) : null;

	// Sync curlInput when query changes externally (modal opened from outside)
	useEffect(() => {
		if (query?.curl && curlInput !== query.curl) {
			setCurlInput(query.curl);
		}
	}, [query?.curl, curlInput]);

	// Sync initialCurl when curl changes externally (modal opened from outside)
	useEffect(() => {
		if (curl && initialCurl === null) {
			setInitialCurl(curl);
		}
	}, [curl, initialCurl]);

	// Derive response from initialQuery or execution result
	const [executedResponse, setExecutedResponse] = useState<CurlResponse | null>(null);
	const response = query?.response || executedResponse;

	const handleExecute = async () => {
		if (!parsed) return;

		setIsExecuting(true);
		setExecutedResponse(null);

		try {
			const startTime = Date.now();

			// Build curl command from parsed query
			const headers = Object.entries(parsed.headers)
				.map(([key, value]) => `-H "${key}: ${value}"`)
				.join(' ');

			// Minify JSON body before sending
			const bodyToSend = parsed.body ? minifyJSON(parsed.body) : '';
			const data = bodyToSend ? `-d '${bodyToSend}'` : '';
			// Use single quotes for URL to preserve special characters without escaping
			const command = `-X ${parsed.method} '${parsed.url}' ${headers} ${data}`.trim();

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

			// Update query with new response
			setQuery(prev => prev ? {
				...prev,
				curl: curlInput,
				updatedAt: new Date().toISOString(),
				response: {
					status,
					statusText,
					headers: headersObj,
					body: bodyText,
					responseTime,
				},
			} : {
				id: '',
				curl: curlInput,
				updatedAt: new Date().toISOString(),
				response: {
					status,
					statusText,
					headers: headersObj,
					body: bodyText,
					responseTime,
				},
			});

			// Save to history with response after successful execution
			addQueryRecord({
				curl: curlInput,
				response: {
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

	const handleCopyResponse = () => {
		if (response) {
			navigator.clipboard.writeText(response.body);
		}
	};

	// Helper to update curlInput when form fields change
	const updateCurlInput = (updates: Partial<typeof parsed>) => {
			if (!parsed) return;
		const updated = { ...parsed, ...updates };
		const headers = Object.entries(updated.headers)
			.map(([key, value]) => `-H "${key}: ${value}"`)
			.join(' ');
		const bodyToSend = updated.body ? minifyJSON(updated.body) : '';
		const data = bodyToSend ? `-d '${bodyToSend}'` : '';
		const newCurl = `curl -X ${updated.method} '${updated.url}' ${headers} ${data}`.trim();
		setCurlInput(newCurl);
		setQuery(prev => prev ? { ...prev, curl: newCurl } : { id: '', curl: newCurl });
	};

	return (
		<BaseDialog
			open={!!initialCurl}
			onOpenChange={(open) => {
				if (!open) {
					setInitialCurl(null);
					setQuery(undefined);
					onClose?.();
				}
			}}
			title={<><Send className="w-5 h-5" /> Enviar Query</>}
			description="Enviar query"
			maxWidth="max-w-6xl"
			maxHeight="max-h-[90vh]"
		>
				{parsed ? (
					<div className="flex-1 flex overflow-hidden">
						{/* Left side: Editable form */}
						<div className="w-1/2 p-4 border-r overflow-y-auto">
							<div className="space-y-4">
								<div className="flex gap-2">
									<div className="w-24">
										<label htmlFor="fetcher-method" className="text-xs font-medium block mb-1.5">Método</label>
										<select
											id="fetcher-method"
											value={parsed.method}
											onChange={(e) => updateCurlInput({ method: e.target.value })}
											className="w-full px-2.5 py-1.5 text-sm border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all"
										>
											{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
												<option key={m} value={m}>{m}</option>
											))}
										</select>
									</div>
									<div className="flex-1">
										<label htmlFor="fetcher-url" className="text-xs font-medium block mb-1.5">URL</label>
										<input
											id="fetcher-url"
											type="text"
											value={parsed.url}
											onChange={(e) => updateCurlInput({ url: e.target.value })}
											className="w-full px-2.5 py-1.5 text-sm border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 font-mono transition-all"
										/>
									</div>
									<div className="flex items-end">
										<button
											type="button"
											onClick={handleExecute}
											disabled={isExecuting}
											aria-label={isExecuting ? "Enviando query" : "Enviar query"}
											className="flex items-center justify-center gap-2 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 shadow-sm font-medium"
										>
											{isExecuting ? (
												<>
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
													Enviando
												</>
											) : (
												<>
													<Send className="w-3.5 h-3.5" />
													Enviar
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
											aria-label="Agregar header"
											onClick={() => updateCurlInput({ headers: { ...parsed.headers, '': '' } })}
											className="text-xs text-primary hover:underline flex items-center gap-1"
										>
											<Plus className="w-3 h-3" /> Agregar
										</button>
									</div>
									<div className="space-y-2">
										{Object.entries(parsed.headers)
											.slice(0, headersExpanded ? undefined : MAX_HEADERS_DISPLAY)
											.map(([key, value]) => (
												<div key={key} className="grid grid-cols-[3fr_7fr_auto] gap-4 items-center">
													<input
														type="text"
														value={key}
														onChange={(e) => {
															const newHeaders = { ...parsed.headers };
															delete newHeaders[key];
															newHeaders[e.target.value] = value;
															updateCurlInput({ headers: newHeaders });
														}}
														placeholder="Header name"
														className="w-full px-2 py-1 text-xs border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all"
													/>
													{key.toLowerCase() === 'authorization' ? (
														<div className="relative">
															<input
																type="text"
																value={value}
																onChange={(e) => updateCurlInput({
																	headers: { ...parsed.headers, [key]: e.target.value }
																})}
																placeholder="Value"
																className={`w-full px-2 py-1 pr-8 text-xs border rounded-md focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-offset-1 transition-all ${
																	parsed.isTokenExpired
																		? 'bg-warning/10 border-warning text-warning-foreground'
																		: 'focus:ring-primary border-input'
																}`}
															/>
															<AlertTriangle className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warning" />
														</div>
													) : (
														<input
															type="text"
															value={value}
															onChange={(e) => updateCurlInput({
																headers: { ...parsed.headers, [key]: e.target.value }
															})}
															placeholder="Value"
															className="w-full px-2 py-1 text-xs border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all"
														/>
													)}
													<button
														type="button"
														aria-label="Eliminar header"
														onClick={() => {
															const newHeaders = { ...parsed.headers };
															delete newHeaders[key];
															updateCurlInput({ headers: newHeaders });
														}}
														className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none focus-visible:ring-offset-1"
													>
														<X className="w-3.5 h-3.5" />
													</button>
												</div>
											))}
										{Object.keys(parsed.headers).length > MAX_HEADERS_DISPLAY && (
											<button
												type="button"
												onClick={() => setHeadersExpanded(!headersExpanded)}
												className="text-xs text-primary hover:underline"
											>
												{headersExpanded ? 'Mostrar menos' : `Mostrar ${Object.keys(parsed.headers).length - MAX_HEADERS_DISPLAY} más`}
											</button>
										)}
									</div>
								</div>

								<div>
									<label htmlFor="fetcher-body" className="text-xs font-medium block mb-1.5">Body</label>
									<textarea
										id="fetcher-body"
										value={parsed.body}
										onChange={(e) => updateCurlInput({ body: e.target.value })}
										placeholder='{"key": "value"}'
										className="w-full h-60 px-2.5 py-1.5 text-sm border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 font-mono transition-all resize-none"
									/>
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
											className="ml-auto px-2 py-1 text-xs border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 w-48 transition-all"
										/>
									</div>

									{/* Response content */}
									<div className="flex-1 overflow-auto bg-muted/50 rounded-md p-3 relative">
										{activeTab === 'body' ? (
											<>
											<button
												type="button"
												aria-label="Copiar respuesta"
												onClick={handleCopyResponse}
												className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 shadow-sm"
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
									
									<div className="mt-3 text-xs text-muted-foreground flex items-center justify-between font-medium">
										<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
												response.status >= 200 && response.status < 300
													? 'bg-success/10 text-success'
													: response.status >= 400 || response.status === 0
														? 'bg-destructive/10 text-destructive'
														: 'bg-warning/10 text-warning'
											}`} title={query?.updatedAt ? new Date(query.updatedAt).toLocaleString() : new Date().toLocaleString()}>
												{response.status} {response.statusText}
											</span>
										<span className="flex items-center gap-4">
											<span>{response.responseTime}ms</span>
											<span className="text-[10px] text-muted-foreground/60">{DayJS(query?.updatedAt || new Date()).fromNow()}</span>
										</span>
									</div>
								</>
							) : (
								<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
									Ejecuta la query para ver la respuesta
								</div>
							)}
						</div>
					</div>
				):
				<div className="p-4 text-center text-sm text-muted-foreground">
					El cURL ingresado no es válido
				</div>
				}
		</BaseDialog>
	);
}
