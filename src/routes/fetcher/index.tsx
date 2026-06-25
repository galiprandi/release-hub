import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Send, Search, X } from 'lucide-react';
import { useFetcherHistory } from '@/hooks/useFetcherHistory';
import { useCurlAccess } from '@/hooks/useCurlAccess';
import { StatusCard } from '@/components/ui/StatusCard';
import { EmptyState } from '@/components/EmptyState';
import { QueryModal } from '@/components/QueryModal';
import { Table } from '@/components/ui/Table';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import type { ColumnDef } from '@tanstack/react-table';
import { parseCurlForDisplay, parseCurlCommand } from '@/utils/curlParser';
import type { QueryRecord } from '@/types/queries';
import { PageLayout } from '@/layouts/PageLayout';
import { IndustrialTabs } from '@/components/shared/IndustrialTabs';
import DayJS from '@/lib/dayjs';

type FetcherSortBy = 'recent' | 'method' | 'status' | 'duration';
type FetcherMethod = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface FetcherSearch {
	method?: FetcherMethod;
	sortBy?: FetcherSortBy;
	q?: string;
}

export const Route = createFileRoute('/fetcher/')({
	component: FetcherPage,
	validateSearch: (search: Record<string, unknown>): FetcherSearch => {
		return {
			method: (search.method as FetcherMethod) || 'ALL',
			sortBy: (search.sortBy as FetcherSortBy) || 'recent',
			q: typeof search.q === 'string' ? search.q : undefined,
		};
	},
});

function FetcherPage() {
	const { data: access, isLoading: checkingAccess } = useCurlAccess();
	const { history, isLoading: loadingHistory, deleteQueryRecord, isDeleting } = useFetcherHistory();
	const navigate = useNavigate({ from: '/fetcher' });
	const search = useSearch({ from: '/fetcher' });
	const [activeQuery, setActiveQuery] = useState<QueryRecord | undefined>();
	const [editingQuery, setEditingQuery] = useState<QueryRecord | undefined>();
	const [curlInput, setCurlInput] = useState('');
	const lastClipboardContent = useRef<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [queryToDelete, setQueryToDelete] = useState<QueryRecord | undefined>();

	useEffect(() => {
		if (access && !access.isInstalled) {
			navigate({ to: '/fetcher/setup' });
		}
	}, [access, navigate]);

	// Magic Clipboard: Auto-detect cURL in clipboard on focus
	useEffect(() => {
		const checkClipboard = async () => {
			if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.readText) return;

			try {
				const text = await navigator.clipboard.readText();
				if (!text || text === lastClipboardContent.current) return;

				lastClipboardContent.current = text;

				if (text.trim().toLowerCase().startsWith('curl')) {
					try {
						parseCurlCommand(text);
						// Valid curl found, open modal automatically
						const now = new Date().toISOString();
						setActiveQuery({ id: '', curl: text, createdAt: now, updatedAt: now });
					} catch {
						// Not a valid curl, ignore
					}
				}
			} catch {
				// Clipboard access denied or other error, ignore
			}
		};

		// Check on mount and window focus to catch external copies
		checkClipboard();
		window.addEventListener('focus', checkClipboard);
		return () => window.removeEventListener('focus', checkClipboard);
	}, []);

	// Handle changes to filters and sorting
	const handleFilterChange = useCallback((method: FetcherMethod) => {
		navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => ({ ...prev, method }),
		});
	}, [navigate]);

	const handleSortChange = useCallback((sortBy: FetcherSortBy) => {
		navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => ({ ...prev, sortBy }),
		});
	}, [navigate]);

	const handleQuerySearch = useCallback((q: string) => {
		navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => ({
				...prev,
				q: q || undefined
			}),
		});
	}, [navigate]);

	// Filter and sort history based on search parameters
	const filteredAndSortedHistory = useMemo(() => {
		let result = [...history];

		// Text search filter
		if (search.q) {
			const q = search.q.toLowerCase();
			result = result.filter(query => {
				const parsed = parseCurlForDisplay(query.curl);
				return (
					query.curl.toLowerCase().includes(q) ||
					(parsed && (
						parsed.domain.toLowerCase().includes(q) ||
						parsed.path.toLowerCase().includes(q)
					))
				);
			});
		}

		// Method Filter
		if (search.method && search.method !== 'ALL') {
			result = result.filter(query => {
				const parsed = parseCurlForDisplay(query.curl);
				return parsed?.method.toUpperCase() === search.method;
			});
		}

		// Sort
		result.sort((a, b) => {
			if (search.sortBy === 'recent') {
				return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
			}
			if (search.sortBy === 'method') {
				const methodA = parseCurlForDisplay(a.curl)?.method || '';
				const methodB = parseCurlForDisplay(b.curl)?.method || '';
				return methodA.localeCompare(methodB);
			}
			if (search.sortBy === 'status') {
				const statusA = a.response?.status || 0;
				const statusB = b.response?.status || 0;
				return statusB - statusA;
			}
			if (search.sortBy === 'duration') {
				const durA = a.response?.responseTime || 0;
				const durB = b.response?.responseTime || 0;
				return durB - durA;
			}
			return 0;
		});

		return result;
	}, [history, search.method, search.sortBy, search.q]);

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


	const handleDelete = useCallback((query: QueryRecord) => {
		setQueryToDelete(query);
		setDeleteDialogOpen(true);
	}, []);

	const handleConfirmDelete = useCallback(() => {
		if (queryToDelete) {
			deleteQueryRecord(queryToDelete.id);
			setDeleteDialogOpen(false);
			setQueryToDelete(undefined);
		}
	}, [queryToDelete, deleteQueryRecord]);

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
				const now = new Date().toISOString();
				setActiveQuery({ id: '', curl: curlInput, createdAt: now, updatedAt: now });
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

	const handleCopyResponse = useCallback(async (query: QueryRecord) => {
		if (query.response?.body) {
			try {
				await navigator.clipboard.writeText(query.response.body);
			} catch (error) {
				console.error('Failed to copy to clipboard:', error);
			}
		}
	}, []);

	const handleCopyCurl = useCallback(async (query: QueryRecord) => {
		try {
			await navigator.clipboard.writeText(query.curl);
		} catch (error) {
			console.error('Failed to copy cURL to clipboard:', error);
		}
	}, []);

	const headerActions = (
		<form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); handleSendCurl(); }}>
			<div className="relative">
				<input
					type="text"
					value={curlInput}
					onChange={(e) => setCurlInput(e.target.value)}
					placeholder="Importar cURL... (curl -X GET...)"
					className="w-80 px-3 py-1.5 text-sm border border-border/60 bg-muted/40 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 font-mono transition-shadow placeholder:text-muted-foreground/40"
				/>
			</div>
			<ActionButton
				action={ACTION_DEFINITIONS.send}
				onClick={handleSendCurl}
				disabled={!isCurlValid}
				size="md"
				className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
			/>
		</form>
	);

	const searchComponent = (
		<div className="flex items-center gap-4">
			<div className="flex items-center gap-2">
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Búsqueda</span>
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
					<input
						type="text"
						value={search.q || ''}
						onChange={(e) => {
							handleQuerySearch(e.target.value);
						}}
						placeholder="Buscar en historial..."
						className="w-48 pl-8 pr-3 py-1.5 bg-muted/40 border border-border/60 rounded-lg text-[11px] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground/40 font-medium uppercase tracking-tight"
					/>
					{search.q && (
						<button
							type="button"
							onClick={() => {
								handleQuerySearch('');
							}}
							className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted-foreground/10 rounded-full text-muted-foreground transition-all"
						>
							<X className="w-2.5 h-2.5" />
						</button>
					)}
				</div>
			</div>
			<div className="w-px h-6 bg-border/40 mx-1" />
			<div className="flex items-center gap-2">
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Método</span>
				<IndustrialTabs
					options={[
						{ id: 'ALL', label: 'Todos' },
						{ id: 'GET', label: 'GET' },
						{ id: 'POST', label: 'POST' },
						{ id: 'PUT', label: 'PUT' },
						{ id: 'DELETE', label: 'DELETE' },
						{ id: 'PATCH', label: 'PATCH' },
					]}
					activeId={search.method || 'ALL'}
					onChange={handleFilterChange}
					className="w-[320px]"
				/>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Orden</span>
				<IndustrialTabs
					options={[
						{ id: 'recent', label: 'Recientes' },
						{ id: 'method', label: 'Método' },
						{ id: 'status', label: 'Status' },
						{ id: 'duration', label: 'Duración' },
					]}
					activeId={search.sortBy || 'recent'}
					onChange={handleSortChange}
					className="w-[280px]"
				/>
			</div>
		</div>
	);

	return (
		<PageLayout 
			header={{
				title: "Fetcher",
				searchComponent: access?.hasAccess && history.length > 0 ? searchComponent : undefined
			}}
			actions={access?.hasAccess ? [headerActions] : []}
		>
			<div className="space-y-6">
			{/* Content */}
			{checkingAccess ? (
				<StatusCard type="loading" message="Verificando acceso a curl..." />
			) : access?.hasAccess ? (
				loadingHistory ? (
					<StatusCard type="loading" message="Cargando historial..." />
				) : history.length === 0 ? (
					<EmptyState
						icon={<Send className="w-8 h-8 text-muted-foreground/40" />}
						label="Historial Vacío"
						caption="Pega un comando cURL en la barra superior o copia uno al portapapeles para comenzar."
					/>
				) : (
					<QueriesTable
						queries={filteredAndSortedHistory}
						onOpenModal={handleOpenModal}
						onCopyResponse={handleCopyResponse}
						onCopyCurl={handleCopyCurl}
						onDelete={handleDelete}
						isDeleting={isDeleting}
					/>
				)
			) : (
				<StatusCard
					type="error"
					message="No se tiene acceso a curl. Asegúrate de que curl esté instalado en el sistema."
				/>
			)}

			<QueryModal
				key={activeQuery?.curl || editingQuery?.curl || 'empty'}
				setQuery={setActiveQuery}
				query={activeQuery || editingQuery}
				onClose={handleCloseModal}
			/>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleConfirmDelete}
				itemName={queryToDelete ? `esta query (${queryToDelete.curl.slice(0, 50)}...)` : undefined}
				isDeleting={isDeleting}
			/>
		</div>
		</PageLayout>
	);
}

function QueriesTable({
	queries,
	onOpenModal,
	onCopyResponse,
	onCopyCurl,
	onDelete,
	isDeleting,
}: {
	queries: QueryRecord[]
	onOpenModal: (query: QueryRecord) => void
	onCopyResponse: (query: QueryRecord) => void
	onCopyCurl: (query: QueryRecord) => void
	onDelete: (query: QueryRecord) => void
	isDeleting: boolean
}) {
	const columns: ColumnDef<QueryRecord>[] = useMemo(() => [
		{
			accessorKey: "url",
			header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">URL</span>,
			cell: ({ row }) => <UrlCell query={row.original} />,
		},
		{
			id: "method",
			accessorFn: (row) => {
				const parsed = parseCurlForDisplay(row.curl);
				return parsed?.method || '';
			},
			header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Método</span>,
			cell: ({ row }) => <MethodCell query={row.original} />,
			filterFn: 'equalsString',
		},
		{
			accessorKey: "updatedAt",
			header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Enviado</span>,
			cell: ({ row }) => <SentCell query={row.original} />,
		},
		{
			accessorKey: "responseTime",
			header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Tiempo</span>,
			cell: ({ row }) => <ResponseTimeCell query={row.original} />,
		},
		{
			id: "status",
			accessorFn: (row) => row.response?.status || null,
			header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Status</span>,
			cell: ({ row }) => <StatusCell query={row.original} />,
		},
		{
			id: "actions",
			accessorKey: "actions",
			header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 text-right block">Acciones</span>,
			enableSorting: false,
			cell: ({ row }) => (
				<ActionsCell
					query={row.original}
					onOpenModal={onOpenModal}
					onCopyResponse={onCopyResponse}
					onCopyCurl={onCopyCurl}
					onDelete={onDelete}
					isDeleting={isDeleting}
				/>
			),
		},
	], [onOpenModal, onCopyResponse, onCopyCurl, onDelete, isDeleting])

	return (
		<Table
			columns={columns}
			data={queries}
			pageSize={20}
		/>
	)
}

function MethodCell({ query }: { query: QueryRecord }) {
	const parsed = parseCurlForDisplay(query.curl)
	if (!parsed) return null

	const methodStyles: Record<string, string> = {
		GET: "bg-success/20 text-success border-success/20",
		POST: "bg-info/20 text-info border-info/20",
		PUT: "bg-warning/20 text-warning border-warning/20",
		PATCH: "bg-warning/20 text-warning border-warning/20",
		DELETE: "bg-destructive/20 text-destructive border-destructive/20",
	}

	const style = methodStyles[parsed.method.toUpperCase()] || "bg-muted/40 text-muted-foreground border-border/40"

	return (
		<span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style}`}>
			{parsed.method}
		</span>
	)
}

function UrlCell({ query }: { query: QueryRecord }) {
	const parsed = parseCurlForDisplay(query.curl)
	if (!parsed) return null

	const fullPath = parsed.path.length > 80 ? `${parsed.path.slice(0, 80)}...` : parsed.path
	return (
		<div className="flex flex-col">
			<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 truncate max-w-md">
				{parsed.domain}
			</span>
			<span className="text-sm font-medium tracking-tight text-foreground truncate max-w-md">
				{fullPath}
			</span>
		</div>
	)
}

function SentCell({ query }: { query: QueryRecord }) {
	return (
		<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60" title={query.updatedAt ? DayJS(query.updatedAt).format('LLL') : 'Nunca'}>
			{query.updatedAt ? DayJS(query.updatedAt).fromNow() : 'Nunca'}
		</span>
	)
}

function StatusCell({ query }: { query: QueryRecord }) {
	if (query.response?.status) {
		const { status } = query.response
		let style = "bg-muted/40 text-muted-foreground border-border/40"
		if (status >= 200 && status < 300) style = "bg-success/20 text-success border-success/20"
		else if (status >= 400 && status < 500) style = "bg-warning/20 text-warning border-warning/20"
		else if (status >= 500) style = "bg-destructive/20 text-destructive border-destructive/20"

		return (
			<span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style}`}>
				{status}
			</span>
		)
	}
	return <span className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-wider">-</span>
}

function ResponseTimeCell({ query }: { query: QueryRecord }) {
	if (query.response?.responseTime) {
		const { responseTime } = query.response
		let style = "bg-muted/40 text-muted-foreground border-border/40"
		if (responseTime < 200) style = "bg-success/20 text-success border-success/20"
		else if (responseTime > 1000) style = "bg-destructive/20 text-destructive border-destructive/20"

		return (
			<span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style}`}>
				{responseTime}ms
			</span>
		)
	}
	return <span className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-wider">-</span>
}

function ActionsCell({
	query,
	onOpenModal,
	onCopyResponse,
	onCopyCurl,
	onDelete,
	isDeleting,
}: {
	query: QueryRecord
	onOpenModal: (query: QueryRecord) => void
	onCopyResponse: (query: QueryRecord) => void
	onCopyCurl: (query: QueryRecord) => void
	onDelete: (query: QueryRecord) => void
	isDeleting: boolean
}) {
	return (
		<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
			<ActionButton
				action={ACTION_DEFINITIONS.send}
				onClick={() => onOpenModal(query)}
				size="sm"
				className="text-success hover:bg-success/20"
			/>
			<div className="w-px h-4 bg-border/40 mx-0.5" />
			<ActionButton
				action={ACTION_DEFINITIONS.copyCurl}
				onClick={() => onCopyCurl(query)}
				size="sm"
			/>
			{query.response?.body && (
				<ActionButton
					action={ACTION_DEFINITIONS.copy}
					onClick={() => onCopyResponse(query)}
					size="sm"
				/>
			)}
			<div className="w-px h-4 bg-border/40 mx-0.5" />
			<ActionButton
				action={ACTION_DEFINITIONS.delete}
				onClick={() => onDelete(query)}
				disabled={isDeleting}
				size="sm"
			/>
		</div>
	)
}
