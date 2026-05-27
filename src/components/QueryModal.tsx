
import { useState, type Dispatch, type SetStateAction } from 'react';
import { Send, AlertTriangle, Plus } from 'lucide-react';
import { BaseDialog } from '@/components/ui/BaseDialog';
import { JsonEditor } from '@/components/JsonEditor';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';
import { parseCurlCommand, minifyJSON } from '@/utils/curlParser';
import type { QueryRecord } from '@/types/queries';
import { executeCurlCommand } from '@/api/curl';
import { useFetcherHistory } from '@/hooks/useFetcherHistory';
import DayJS from '@/lib/dayjs';

interface QueryModalProps {
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

interface ParsedCurl {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
	queryParams: Record<string, string>;
	isTokenExpired?: boolean;
}

function parseInitialCurl(curl?: string): ParsedCurl {
	if (!curl) {
		return {
			method: 'GET',
			url: '',
			headers: {},
			body: '',
			queryParams: {},
		};
	}
	try {
		const parsed = parseCurlCommand(curl);
		if (parsed) return parsed;
	} catch {
		// Ignore parse error, return defaults
	}
	return {
		method: 'GET',
		url: '',
		headers: {},
		body: '',
		queryParams: {},
	};
}

export function QueryModal({ query, setQuery, onClose }: QueryModalProps) {
	const [form, setForm] = useState<ParsedCurl>(() => parseInitialCurl(query?.curl));
	const [isExecuting, setIsExecuting] = useState(false);
	const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
	const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body'>(() =>
		form.method === 'GET' ? 'params' : 'body'
	);
	const [headersExpanded, setHeadersExpanded] = useState(false);
	const [bodySearchQuery, setBodySearchQuery] = useState('');
	const [requestBodySearchQuery, setRequestBodySearchQuery] = useState('');

	const { addQueryRecord } = useFetcherHistory();

	// Derive response from initialQuery or execution result
	const [executedResponse, setExecutedResponse] = useState<CurlResponse | null>(null);
	const response = query?.response || executedResponse;

	const handleExecute = async () => {
		setIsExecuting(true);
		setExecutedResponse(null);

		try {
			const startTime = Date.now();

			// Build args directly from form state
			let finalUrl = form.url;
			try {
				const urlObj = new URL(form.url);
				urlObj.search = '';
				Object.entries(form.queryParams).forEach(([key, value]) => {
					if (key) urlObj.searchParams.set(key, value);
				});
				finalUrl = urlObj.toString();
			} catch {
				// Keep original URL if invalid
			}

			const args: string[] = ['-X', form.method];
			Object.entries(form.headers).forEach(([key, value]) => {
				args.push('-H', `${key}: ${value}`);
			});
			if (form.body) {
				const trimmed = form.body.trim();
				const looksLikeJson = (trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'));
				if (looksLikeJson) {
					try {
						args.push('-d', minifyJSON(form.body));
					} catch {
						args.push('-d', form.body);
					}
				} else {
					args.push('-d', form.body);
				}
			}
			args.push(finalUrl);

			// Build curl string for history (format parseable by parseCurlCommand)
			const curlParts: string[] = [`curl -X ${form.method}`];
			Object.entries(form.headers).forEach(([key, value]) => {
				curlParts.push(`-H "${key}: ${value}"`);
			});
			if (form.body) {
				const trimmed = form.body.trim();
				const looksLikeJson = (trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'));
				if (looksLikeJson) {
					try {
						curlParts.push(`-d '${minifyJSON(form.body)}'`);
					} catch {
						curlParts.push(`-d '${form.body}'`);
					}
				} else {
					curlParts.push(`-d '${form.body}'`);
				}
			}
			curlParts.push(finalUrl);
			const curlString = curlParts.join(' ');

			const result = await executeCurlCommand(args);
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
				curl: curlString,
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
				curl: curlString,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				response: {
					status,
					statusText,
					headers: headersObj,
					body: bodyText,
					responseTime,
				},
			});

			// Save to history with response after execution
			addQueryRecord({
				curl: curlString,
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

	return (
		<BaseDialog
			open={!!query?.curl}
			onOpenChange={(open) => {
				if (!open) {
					onClose?.();
				}
			}}
			title={
				<div className="flex items-center gap-3">
					<Send className="w-5 h-5" />
					<span>Enviar Query</span>
				</div>
			}
			description="Enviar query"
			maxWidth="max-w-6xl"
			maxHeight="max-h-[90vh]"
			className="min-h-[600px]"
		>
			<>
				{/* URL and method controls */}
				<div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
					<div className="w-24 flex-shrink-0">
						<select
							value={form.method}
							onChange={(e) => {
								const newMethod = e.target.value;
								setForm(prev => ({ ...prev, method: newMethod }));
								// Auto-switch tab: GET -> params, others -> body
								if (newMethod === 'GET') {
									setRequestTab('params');
								} else {
									setRequestTab('body');
								}
							}}
							className="w-full px-2.5 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-shadow"
						>
							{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
								<option key={m} value={m}>{m}</option>
							))}
						</select>
					</div>
					<div className="flex-1 min-w-0">
						<input
							type="text"
							value={form.url}
							onChange={(e) => {
								const newUrl = e.target.value;
								// Extract query params from the new URL
								let newQueryParams = { ...form.queryParams };
								try {
									const urlObj = new URL(newUrl);
									newQueryParams = {};
									urlObj.searchParams.forEach((value, key) => {
										newQueryParams[key] = value;
									});
								} catch {
									// URL invalid, keep existing params
								}
								setForm(prev => ({ ...prev, url: newUrl, queryParams: newQueryParams }));
							}}
							className="w-full px-2.5 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 font-mono transition-shadow"
							placeholder="https://..."
						/>
					</div>
					<ActionButton
						action={isExecuting ? ACTION_DEFINITIONS.loading : ACTION_DEFINITIONS.send}
						onClick={handleExecute}
						disabled={isExecuting}
						showLabel
						className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-tight flex-shrink-0"
					/>
				</div>

				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Main content grid */}
					<div className="flex-1 grid grid-cols-2 overflow-hidden">
						{/* Left side: Editable form */}
						<div className="p-4 border-r flex flex-col">
							<div className="space-y-4 flex-1 flex flex-col">
								{/* Request tabs */}
								<div className="flex p-1 bg-muted/40 border border-border/60 rounded-lg gap-1 items-center flex-shrink-0">
									<button
										type="button"
										onClick={() => setRequestTab('params')}
										className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
											requestTab === 'params'
												? 'bg-background shadow-sm text-foreground'
												: 'text-muted-foreground hover:bg-accent'
										}`}
									>
										Params
									</button>
									<button
										type="button"
										onClick={() => setRequestTab('headers')}
										className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
											requestTab === 'headers'
												? 'bg-background shadow-sm text-foreground'
												: 'text-muted-foreground hover:bg-accent'
										}`}
									>
										Headers
									</button>
									<button
										type="button"
										onClick={() => setRequestTab('body')}
										className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
											requestTab === 'body'
												? 'bg-background shadow-sm text-foreground'
												: 'text-muted-foreground hover:bg-accent'
										}`}
									>
										Body
									</button>
								</div>

								{/* Request content */}
								<div className="flex-1 overflow-auto">
									{requestTab === 'params' && (
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Query Params</label>
												<ActionButton
													action={{ icon: Plus, label: "Agregar", color: "primary" }}
													onClick={() => setForm(prev => ({
														...prev,
														queryParams: { ...prev.queryParams, [`new-${Date.now()}`]: '' }
													}))}
													size="sm"
													showLabel
													className="text-[10px] font-bold uppercase tracking-wider hover:underline p-0 h-auto"
												/>
											</div>
											<div className="space-y-2">
												{Object.entries(form.queryParams).map(([key, value], index) => (
													<div key={key || `new-${index}`} className="grid grid-cols-[3fr_7fr_auto] gap-4 items-center">
														<input
																type="text"
																value={key}
																onChange={(e) => {
																	const newQueryParams = { ...form.queryParams };
																	delete newQueryParams[key];
																	newQueryParams[e.target.value] = value;
																	setForm(prev => ({ ...prev, queryParams: newQueryParams }));
																}}
																placeholder="Key"
																className="w-full px-2.5 py-1.5 text-xs border border-input bg-background rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-shadow"
														/>
															<input
																	type="text"
																	value={value}
																	onChange={(e) => setForm(prev => ({
																		...prev,
																		queryParams: { ...prev.queryParams, [key]: e.target.value }
																	}))}
																	placeholder="Value"
																	className="w-full px-2.5 py-1.5 text-xs border border-input bg-background rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-shadow"
															/>
															<ActionButton
																	action={ACTION_DEFINITIONS.delete}
																	onClick={() => {
																		const newQueryParams = { ...form.queryParams };
																		delete newQueryParams[key];
																		setForm(prev => ({ ...prev, queryParams: newQueryParams }));
																	}}
																	size="sm"
																/>
													</div>
												))}
												{Object.keys(form.queryParams).length === 0 && (
													<div className="text-xs text-muted-foreground text-center py-2">
														No hay query params
													</div>
												)}
											</div>
										</div>
									)}

									{requestTab === 'headers' && (
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Headers</label>
												<ActionButton
													action={{ icon: Plus, label: "Agregar", color: "primary" }}
													onClick={() => setForm(prev => ({
														...prev,
														headers: { ...prev.headers, [`new-${Date.now()}`]: '' }
													}))}
													size="sm"
													showLabel
													className="text-[10px] font-bold uppercase tracking-wider hover:underline p-0 h-auto"
												/>
											</div>
											<div className="space-y-2">
												{Object.entries(form.headers)
													.slice(0, headersExpanded ? undefined : MAX_HEADERS_DISPLAY)
													.map(([key, value], index) => (
														<div key={key || `new-header-${index}`} className="grid grid-cols-[3fr_7fr_auto] gap-4 items-center">
															<input
																	type="text"
																	value={key}
																	onChange={(e) => {
																			const newHeaders = { ...form.headers };
																			delete newHeaders[key];
																			newHeaders[e.target.value] = value;
																			setForm(prev => ({ ...prev, headers: newHeaders }));
																		}}
																	placeholder="Header name"
																	className="w-full px-2.5 py-1.5 text-xs border border-input bg-background rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-shadow"
															/>
															{key.toLowerCase() === 'authorization' ? (
																	<div className="relative">
																		<input
																			type="text"
																			value={value}
																			onChange={(e) => setForm(prev => ({
																					...prev,
																					headers: { ...prev.headers, [key]: e.target.value }
																				}))}
																			placeholder="Value"
																			className={`w-full px-2.5 py-1.5 pr-8 text-xs border bg-background rounded-md focus:outline-none focus-visible:ring-2 transition-shadow ${
																				form.isTokenExpired && value.trim().length > 0
																						? 'bg-warning/10 border-warning text-warning-foreground focus-visible:ring-warning'
																						: 'focus-visible:ring-primary border-input'
																				}`}
																	/>
																	{form.isTokenExpired && value.trim().length > 0 && (
																		<AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warning" />
																	)}
																</div>
															) : (
																	<input
																			type="text"
																			value={value}
																			onChange={(e) => setForm(prev => ({
																					...prev,
																					headers: { ...prev.headers, [key]: e.target.value }
																				}))}
																			placeholder="Value"
																			className="w-full px-2.5 py-1.5 text-xs border border-input bg-background rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-shadow"
																		/>
															)}
															<ActionButton
																	action={ACTION_DEFINITIONS.delete}
																	onClick={() => {
																			const newHeaders = { ...form.headers };
																			delete newHeaders[key];
																			setForm(prev => ({ ...prev, headers: newHeaders }));
																		}}
																	size="sm"
																/>
														</div>
													))}
												{Object.keys(form.headers).length > MAX_HEADERS_DISPLAY && (
													<button
														type="button"
														onClick={() => setHeadersExpanded(!headersExpanded)}
														className="text-xs text-primary hover:underline"
													>
														{headersExpanded ? 'Mostrar menos' : `Mostrar ${Object.keys(form.headers).length - MAX_HEADERS_DISPLAY} más`}
													</button>
												)}
											</div>
										</div>
									)}

									{requestTab === 'body' && (
										<JsonEditor
											value={form.body}
											onChange={(value) => setForm(prev => ({ ...prev, body: value }))}
											placeholder='{"key": "value"}'
											height="min-h-[400px]"
											searchQuery={requestBodySearchQuery}
											onSearchChange={setRequestBodySearchQuery}
										/>
									)}
								</div>
							</div>
						</div>

						{/* Right side: Response panel */}
						<div className="p-4 overflow-hidden flex flex-col">
							{response ? (
								<>
									{/* Tabs - Using industrial resonance style from FilterBar */}
									<div className="flex p-1 bg-muted/40 border border-border/60 rounded-lg gap-1 mb-3 items-center flex-shrink-0">
										<button
											type="button"
											onClick={() => setActiveTab('headers')}
											className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
												activeTab === 'headers'
													? 'bg-background shadow-sm text-foreground'
													: 'text-muted-foreground hover:bg-accent'
											}`}
										>
											Headers
										</button>
										<button
											type="button"
											onClick={() => setActiveTab('body')}
											className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
												activeTab === 'body'
													? 'bg-background shadow-sm text-foreground'
													: 'text-muted-foreground hover:bg-accent'
											}`}
										>
											Body
										</button>
									</div>

									{/* Response content */}
									<div className="flex-1 overflow-auto">
										{activeTab === 'body' ? (
											<JsonEditor
												value={response.body || ''}
												onChange={() => {}}
												readOnly
												height="min-h-[400px]"
												searchQuery={bodySearchQuery}
												onSearchChange={setBodySearchQuery}
											/>
										) : (
											<div className="text-xs font-mono space-y-1 bg-muted/50 rounded-md p-3">
												{Object.entries(response.headers).map(([key, value]) => (
													<div key={key}>
														<span className="font-semibold">{key}:</span> {value}
													</div>
												))}
											</div>
										)}
									</div>
								</>
							) : (
								<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
									Ejecuta la query para ver la respuesta
								</div>
							)}
						</div>
					</div>

					{/* Footer with timing info - spans full width */}
					{response && (
						<div className="px-4 py-3 border-t border-border/40 flex items-center justify-between flex-shrink-0">
							<div className="flex items-center gap-3">
								<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
										response.status >= 200 && response.status < 300
											? 'bg-success/20 text-success'
											: response.status >= 400
												? 'bg-destructive/20 text-destructive'
												: 'bg-warning/20 text-warning'
									}`} title={query?.updatedAt ? formatTimeAgo(query.updatedAt) : new Date().toLocaleString()}>
									{response.status} {response.statusText}
								</span>
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
									{response.responseTime}ms
								</span>
							</div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								{DayJS(query?.updatedAt || new Date()).fromNow()}
							</span>
						</div>
					)}
				</div>
			</>
		</BaseDialog>
	);
}
