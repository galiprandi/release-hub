
import { useState, type Dispatch, type SetStateAction, useMemo } from 'react';
import { Send, AlertTriangle, Plus, Braces, ListFilter, FileText } from 'lucide-react';
import { BaseDialog } from '@/components/ui/BaseDialog';
import { JsonEditor } from '@/components/JsonEditor';
import { FilterBar } from '@/components/shared/FilterBar';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';
import { IndustrialTabs } from '@/components/shared/IndustrialTabs';
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
	const [prevQueryId, setPrevQueryId] = useState<string | undefined>(query?.id);

	if (query?.id !== prevQueryId) {
		setForm(parseInitialCurl(query?.curl));
		setPrevQueryId(query?.id);
	}

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

	const requestFilters = useMemo(() => [
		{ value: 'params', label: 'Params', icon: ListFilter },
		{ value: 'headers', label: 'Headers', icon: Braces },
		{ value: 'body', label: 'Body', icon: FileText },
	], [])

	const responseFilters = useMemo(() => [
		{ value: 'headers', label: 'Headers', icon: Braces },
		{ value: 'body', label: 'Body', icon: FileText },
	], [])

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
					<Send className="w-5 h-5 text-primary" />
					<span className="tracking-tight">Enviar Query</span>
				</div>
			}
			description="Configura y envía una petición HTTP"
			maxWidth="max-w-6xl"
			maxHeight="max-h-[90vh]"
			className="min-h-[600px]"
		>
			<>
				{/* URL and method controls */}
				<div className="flex items-center gap-3 p-4 border-b bg-muted/10 flex-shrink-0">
					<div className="flex-1 flex items-center gap-0.5 bg-background border border-border/60 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 transition-all">
						<div className="relative border-r border-border/60">
							<select
								value={form.method}
								aria-label="Método HTTP"
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
								className="appearance-none bg-muted/40 px-3 py-2 pr-8 text-[10px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-muted/60 transition-colors"
							>
								{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
									<option key={m} value={m}>{m}</option>
								))}
							</select>
							<div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
								<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</div>
						</div>
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
							className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none font-mono"
							placeholder="https://api.example.com/v1/resource"
						/>
					</div>
					<ActionButton
						action={isExecuting ? ACTION_DEFINITIONS.loading : ACTION_DEFINITIONS.send}
						onClick={handleExecute}
						disabled={isExecuting}
						showLabel
						className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold uppercase tracking-tight flex-shrink-0"
					/>
				</div>

				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Main content grid */}
					<div className="flex-1 grid grid-cols-2 overflow-hidden">
						{/* Left side: Editable form */}
						<div className="p-4 border-r border-border/40 flex flex-col">
							<div className="space-y-4 flex-1 flex flex-col">
								{/* Request tabs */}
								<IndustrialTabs
									options={[
										{ id: 'params', label: 'Params' },
										{ id: 'headers', label: 'Headers' },
										{ id: 'body', label: 'Body' },
									]}
									activeId={requestTab}
									onChange={(id) => setRequestTab(id as any)}
									className="flex-shrink-0"
								/>

								{/* Request content */}
								<div className="flex-1 overflow-auto">
									{requestTab === 'params' && (
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Query Params</label>
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
												<label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Headers</label>
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
									<IndustrialTabs
										options={[
											{ id: 'headers', label: 'Headers' },
											{ id: 'body', label: 'Body' },
										]}
										activeId={activeTab}
										onChange={(id) => setActiveTab(id as any)}
										className="mb-3 flex-shrink-0"
									/>

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
											<div className="text-[11px] font-mono space-y-1.5 bg-muted/20 border border-border/40 rounded-lg p-4 h-full overflow-auto">
												{Object.entries(response.headers).map(([key, value]) => (
													<div key={key} className="flex gap-2 pb-1 border-b border-border/20 last:border-0">
														<span className="font-bold text-muted-foreground min-w-[120px] shrink-0 uppercase tracking-tighter">{key}:</span>
														<span className="text-foreground break-all">{value}</span>
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
						<div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex items-center justify-between flex-shrink-0">
							<div className="flex items-center gap-3">
								<span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
										response.status >= 200 && response.status < 300
											? 'bg-success/20 text-success border-success/20'
											: response.status >= 400
												? 'bg-destructive/20 text-destructive border-destructive/20'
												: 'bg-warning/20 text-warning border-warning/20'
									}`} title={query?.updatedAt ? DayJS(query.updatedAt).format('LLL') : DayJS().format('LLL')}>
									{response.status} {response.statusText}
								</span>
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-muted/40 border border-border/40 px-2 py-0.5 rounded-md">
									{response.responseTime}ms
								</span>
							</div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">
								{DayJS(query?.updatedAt || new Date()).fromNow()}
							</span>
						</div>
					)}
				</div>
			</>
		</BaseDialog>
	);
}
