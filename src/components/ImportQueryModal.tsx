import { useState, useEffect } from 'react';
import { Send, Loader2, Copy } from 'lucide-react';
import { BaseDialog } from '@/components/ui/BaseDialog';
import { parseCurlCommand } from '@/utils/curlParser';
import type { QueryRecord } from '@/types/queries';
import { executeCurlCommand } from '@/api/curl';

interface ImportQueryModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImport?: (record: Omit<QueryRecord, 'id' | 'lastSent'>) => void;
	initialQuery?: QueryRecord;
}

interface CurlResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string;
	responseTime: number;
}

export function ImportQueryModal({ open, onOpenChange, onImport, initialQuery }: ImportQueryModalProps) {
	const [curlInput, setCurlInput] = useState('');
	const [parsedQuery, setParsedQuery] = useState<QueryRecord | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isExecuting, setIsExecuting] = useState(false);
	const [response, setResponse] = useState<CurlResponse | null>(null);
	const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');

	// Initialize with initial query if provided
	useEffect(() => {
		if (initialQuery && open) {
			setParsedQuery(initialQuery);
			setIsEditMode(true);
			setCurlInput('');
		} else if (!open) {
			// Reset on close - batch all state updates
			setCurlInput('');
			setParsedQuery(null);
			setIsEditMode(false);
			setResponse(null);
		}
	}, [initialQuery, open]);

	// Parse curl input on change
	useEffect(() => {
		if (curlInput.trim() && !isEditMode) {
			try {
				const parsed = parseCurlCommand(curlInput);
				const record: QueryRecord = {
					...parsed,
					id: '', // Will be generated on save
					lastSent: new Date().toISOString(),
				};
				setParsedQuery(record);
			} catch (error) {
				console.error('Failed to parse curl:', error);
				setParsedQuery(null);
			}
		}
	}, [curlInput, isEditMode]);

	const handleExecute = async () => {
		if (!parsedQuery) return;

		setIsExecuting(true);
		setResponse(null);

		try {
			const startTime = Date.now();

			// Build curl command from parsed query
			const headers = Object.entries(parsedQuery.headers)
				.map(([key, value]) => `-H "${key}: ${value}"`)
				.join(' ');

			const data = parsedQuery.body ? `-d '${parsedQuery.body}'` : '';
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

			setResponse({
				status,
				statusText,
				headers: headersObj,
				body: bodyText,
				responseTime,
			});
		} catch (error) {
			console.error('Failed to execute curl:', error);
			setResponse({
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
		if (parsedQuery && onImport) {
			onImport(parsedQuery);
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
							className="w-full h-32 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
						/>
					</div>
				)}

				{parsedQuery && (
					<div className="flex-1 flex overflow-hidden">
						{/* Left side: Editable form */}
						<div className="w-1/2 p-4 border-r overflow-y-auto">
							<div className="space-y-4">
								<div>
									<label className="text-xs font-medium block mb-1.5">Método</label>
									<select
										value={parsedQuery.method}
										onChange={(e) => setParsedQuery({ ...parsedQuery, method: e.target.value })}
										className="w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
									>
										{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
											<option key={m} value={m}>{m}</option>
										))}
									</select>
								</div>

								<div>
									<label className="text-xs font-medium block mb-1.5">URL</label>
									<input
										type="text"
										value={parsedQuery.url}
										onChange={(e) => setParsedQuery({ ...parsedQuery, url: e.target.value })}
										className="w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
									/>
								</div>

								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label className="text-xs font-medium">Headers</label>
										<button
											type="button"
											onClick={() => setParsedQuery({ ...parsedQuery, headers: { ...parsedQuery.headers, '': '' } })}
											className="text-xs text-primary hover:underline"
										>
											+ Agregar
										</button>
									</div>
									<div className="space-y-2">
										{Object.entries(parsedQuery.headers).map(([key, value]) => (
											<div key={key} className="flex gap-2">
												<input
													type="text"
													value={key}
													onChange={(e) => {
														const newHeaders = { ...parsedQuery.headers };
														delete newHeaders[key];
														newHeaders[e.target.value] = value;
														setParsedQuery({ ...parsedQuery, headers: newHeaders });
													}}
													placeholder="Header name"
													className="flex-1 px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
												/>
												<input
													type="text"
													value={value}
													onChange={(e) => setParsedQuery({
														...parsedQuery,
														headers: { ...parsedQuery.headers, [key]: e.target.value }
													})}
													placeholder="Value"
													className="flex-1 px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
												/>
												<button
													type="button"
													onClick={() => {
														const newHeaders = { ...parsedQuery.headers };
														delete newHeaders[key];
														setParsedQuery({ ...parsedQuery, headers: newHeaders });
													}}
													className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded"
												>
													×
												</button>
											</div>
										))}
									</div>
								</div>

								<div>
									<label className="text-xs font-medium block mb-1.5">Body</label>
									<textarea
										value={parsedQuery.body}
										onChange={(e) => setParsedQuery({ ...parsedQuery, body: e.target.value })}
										placeholder='{"key": "value"}'
										className="w-full h-24 px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
									/>
								</div>

								<div className="flex gap-2 pt-2">
									<button
										type="button"
										onClick={handleExecute}
										disabled={isExecuting}
										className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
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
									{/* Response header */}
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-2">
											<span className={`px-2 py-1 rounded text-xs font-semibold ${
												response.status >= 200 && response.status < 300
													? 'bg-green-100 text-green-700'
													: response.status >= 400
														? 'bg-red-100 text-red-700'
														: 'bg-yellow-100 text-yellow-700'
											}`}>
												{response.status} {response.statusText}
											</span>
											<span className="text-xs text-muted-foreground">{response.responseTime}ms</span>
										</div>
										<button
											type="button"
											onClick={handleCopyResponse}
											className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
											title="Copiar respuesta"
										>
											<Copy className="w-4 h-4" />
										</button>
									</div>

									{/* Tabs */}
									<div className="flex gap-2 mb-3">
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
									</div>

									{/* Response content */}
									<div className="flex-1 overflow-auto bg-muted/50 rounded-md p-3">
										{activeTab === 'body' ? (
											<pre className="text-xs font-mono whitespace-pre-wrap break-all">
												{response.body || '(Sin respuesta)'}
											</pre>
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
