import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Send, Trash2, Copy } from 'lucide-react';
import { useFetcherHistory } from '@/hooks/useFetcherHistory';
import { useCurlAccess } from '@/hooks/useCurlAccess';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusCard } from '@/components/ui/StatusCard';
import { ImportQueryModal } from '@/components/ImportQueryModal';
import { parseCurlForDisplay, parseCurlCommand } from '@/utils/curlParser';
import type { QueryRecord } from '@/types/queries';

export const Route = createFileRoute('/fetcher')({
	component: FetcherPage,
});

// Function to format relative time
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
	if (diffDays < 7) return `hace ${diffDays} días`;
	return date.toLocaleDateString();
}

// Method badge colors
function getMethodBadgeColor(method: string): string {
	switch (method.toUpperCase()) {
		case 'GET':
			return 'bg-success/20 text-success';
		case 'POST':
			return 'bg-info/20 text-info';
		case 'PUT':
		case 'PATCH':
			return 'bg-warning/20 text-warning';
		case 'DELETE':
			return 'bg-destructive/20 text-destructive';
		default:
			return 'bg-muted text-muted-foreground';
	}
}

// Response time badge colors
function getResponseTimeBadgeColor(responseTime: number): string {
	if (responseTime < 200) {
		return 'bg-success/20 text-success';
	}
	if (responseTime > 1000) {
		return 'bg-destructive/20 text-destructive';
	}
	return 'bg-muted text-muted-foreground';
}

function FetcherPage() {
	const { data: access, isLoading: checkingAccess } = useCurlAccess();
	const { history, isLoading: loadingHistory, deleteQueryRecord, isDeleting } = useFetcherHistory();
	const [activeQuery, setActiveQuery] = useState<QueryRecord | undefined>();
	const [editingQuery, setEditingQuery] = useState<QueryRecord | undefined>();
	const [curlInput, setCurlInput] = useState('');

	// Validate curl in real-time
	const isCurlValid = useMemo(() => {
		if (!curlInput.trim()) return false;
		try {
			parseCurlCommand(curlInput);
			return true;
		} catch {
			return false;
		}
	}, [curlInput]);

	// State for filters
	const [methodFilter, setMethodFilter] = useState<'all' | 'GET' | 'POST' | 'PATCH' | 'PUT'>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [page, setPage] = useState(0);
	const pageSize = 20;

	// Calculate filter counts
	const filterCounts = {
		all: history.length,
		GET: history.filter((q) => {
			const parsed = parseCurlForDisplay(q.curl);
			return parsed?.method === 'GET';
		}).length,
		POST: history.filter((q) => {
			const parsed = parseCurlForDisplay(q.curl);
			return parsed?.method === 'POST';
		}).length,
		PATCH: history.filter((q) => {
			const parsed = parseCurlForDisplay(q.curl);
			return parsed?.method === 'PATCH';
		}).length,
		PUT: history.filter((q) => {
			const parsed = parseCurlForDisplay(q.curl);
			return parsed?.method === 'PUT';
		}).length,
	};

	// Filter history based on method and search
	const filteredHistory = history.filter((query) => {
		const parsed = parseCurlForDisplay(query.curl);
		if (!parsed) return false;

		// Method filter
		if (methodFilter !== 'all' && parsed.method !== methodFilter) return false;

		// Search filter (URL, domain, or path)
		if (searchQuery) {
			const queryLower = searchQuery.toLowerCase();
			const urlMatch = parsed.url.toLowerCase().includes(queryLower);
			const domainMatch = parsed.domain.toLowerCase().includes(queryLower);
			const pathMatch = parsed.path.toLowerCase().includes(queryLower);
			if (!urlMatch && !domainMatch && !pathMatch) return false;
		}

		return true;
	});

	// Pagination
	const paginatedHistory = filteredHistory.slice(page * pageSize, (page + 1) * pageSize);
	const totalPages = Math.ceil(filteredHistory.length / pageSize);

	const handleDelete = (id: string) => {
		if (confirm('¿Estás seguro de que quieres eliminar esta query del historial?')) {
			deleteQueryRecord(id);
		}
	};

	const handleOpenModal = (query?: QueryRecord) => {
		setEditingQuery(query);
		if (query) {
			setActiveQuery(query);
		}
	};

	const handleSendCurl = () => {
		if (curlInput.trim()) {
			try {
				// Validate that the curl is parseable
				parseCurlCommand(curlInput);
				setActiveQuery({ id: '', curl: curlInput });
				setCurlInput('');
			} catch (error) {
				console.error('Invalid curl:', error);
				// Optionally show an error message to the user
			}
		}
	};

	const handleCloseModal = () => {
		setActiveQuery(undefined);
		setEditingQuery(undefined);
	};

	const handleCopyResponse = async (query: QueryRecord) => {
		if (query.response?.body) {
			try {
				await navigator.clipboard.writeText(query.response.body);
				// Optionally show a toast notification
			} catch (error) {
				console.error('Failed to copy to clipboard:', error);
			}
		}
	};

	return (
		<div className="space-y-6">
			{/* Filters and search */}
			<FilterBar
				filters={[
					{ value: 'all', label: `Todos (${filterCounts.all})` },
					{ value: 'GET', label: `GET (${filterCounts.GET})` },
					{ value: 'POST', label: `POST (${filterCounts.POST})` },
					{ value: 'PATCH', label: `PATCH (${filterCounts.PATCH})` },
					{ value: 'PUT', label: `PUT (${filterCounts.PUT})` },
				]}
				activeFilter={methodFilter}
				onFilterChange={(value) => {
					setMethodFilter(value as typeof methodFilter);
					setPage(0); // Reset to first page on filter change
				}}
				searchPlaceholder="Buscar query..."
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				rightContent={
					<form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSendCurl(); }}>
						<input
							type="text"
							value={curlInput}
							onChange={(e) => setCurlInput(e.target.value)}
							placeholder="Importar cURL"
							className="w-64 px-3 py-1.5 text-sm bg-background border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground font-mono"
						/>
						<button
							type="submit"
							disabled={!isCurlValid}
							className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-success text-success-foreground rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 shadow-sm"
							aria-label="Importar comando cURL"
						>
							<Send className="w-3.5 h-3.5" />
						</button>
					</form>
				}
			/>

			{/* Content */}
			{checkingAccess ? (
				<StatusCard type="loading" message="Verificando acceso a curl..." />
			) : access?.hasAccess ? (
				loadingHistory ? (
					<StatusCard type="loading" message="Cargando historial..." />
				) : paginatedHistory.length === 0 ? (
					<div className="text-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
						<Send className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
						<p className="text-muted-foreground">No hay queries en el historial</p>
						<p className="text-sm text-muted-foreground mt-1">
							{searchQuery || methodFilter !== 'all' ? 'Intenta con otro filtro' : 'Importa un comando cURL para comenzar'}
						</p>
					</div>
				) : (
					<div className="border border-border/60 rounded-xl overflow-hidden shadow-sm bg-card transition-all">
						<table className="w-full">
							<thead className="bg-muted/40 border-b border-border/60">
								<tr>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Método</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Path</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dominio</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviado</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tiempo</th>
									<th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
								</tr>
							</thead>
							<tbody>
								{paginatedHistory.map((query) => {
									const parsed = parseCurlForDisplay(query.curl);
									if (!parsed) return null;

									return (
										<tr key={query.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
											<td className="px-4 py-3">
												<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getMethodBadgeColor(parsed.method)}`}>
													{parsed.method}
												</span>
											</td>
											<td className="px-4 py-3 text-sm text-foreground font-medium">
												<div className="truncate max-w-md" title={parsed.path}>
													{parsed.path}
												</div>
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">{parsed.domain}</td>
											<td className="px-4 py-3 text-sm text-muted-foreground" title={query.updatedAt ? new Date(query.updatedAt).toLocaleString() : 'Nunca'}>
												{query.updatedAt ? formatTimeAgo(query.updatedAt) : 'Nunca'}
											</td>
											<td className="px-4 py-3 text-sm">
												{query.response?.responseTime ? (
													<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getResponseTimeBadgeColor(query.response.responseTime)}`}>
														{query.response.responseTime}ms
													</span>
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</td>
											<td className="px-4 py-3 text-right">
												<div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
													<button
														type="button"
														className="p-1.5 text-success hover:bg-success/10 rounded transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
														title="Enviar de nuevo"
														aria-label="Enviar de nuevo"
														onClick={() => handleOpenModal(query)}
													>
														<Send className="w-4 h-4" />
													</button>
													{query.response?.body && (
														<button
															type="button"
															className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
															title="Copiar respuesta"
															aria-label="Copiar respuesta"
															onClick={() => handleCopyResponse(query)}
														>
															<Copy className="w-4 h-4" />
														</button>
													)}
													<button
														type="button"
														className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
														title="Eliminar del historial"
														aria-label="Eliminar del historial"
														onClick={() => handleDelete(query.id)}
														disabled={isDeleting}
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
								<div className="text-sm text-muted-foreground">
									Mostrando <span className="font-medium text-foreground">{page * pageSize + 1}</span> - <span className="font-medium text-foreground">{Math.min((page + 1) * pageSize, filteredHistory.length)}</span> de <span className="font-medium text-foreground">{filteredHistory.length}</span>
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setPage(p => Math.max(0, p - 1))}
										disabled={page === 0}
										className="px-3 py-1.5 text-sm font-medium border border-input rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
									>
										Anterior
									</button>
									<div className="px-3 py-1.5 text-sm font-medium bg-muted rounded-md border border-transparent">
										Página {page + 1} de {totalPages}
									</div>
									<button
										type="button"
										onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
										disabled={page === totalPages - 1}
										className="px-3 py-1.5 text-sm font-medium border border-input rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
									>
										Siguiente
									</button>
								</div>
							</div>
						)}
					</div>
				)
			) : (
				<StatusCard
					type="error"
					message="No se tiene acceso a curl. Asegúrate de que curl esté instalado en el sistema."
				/>
			)}

			<ImportQueryModal
				setQuery={setActiveQuery}
				query={activeQuery || editingQuery}
				onClose={handleCloseModal}
			/>
		</div>
	);
}
