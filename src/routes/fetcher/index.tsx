import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useFetcherHistory } from '@/hooks/useFetcherHistory';
import { useCurlAccess } from '@/hooks/useCurlAccess';
import { StatusCard } from '@/components/ui/StatusCard';
import { QueryModal } from '@/components/QueryModal';
import { Table } from '@/components/ui/Table';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';
import type { ColumnDef } from '@tanstack/react-table';
import { parseCurlForDisplay, parseCurlCommand } from '@/utils/curlParser';
import type { QueryRecord } from '@/types/queries';
import { PageLayout } from '@/layouts/PageLayout';

export const Route = createFileRoute('/fetcher/')({
	component: FetcherPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			method: typeof search.method === 'string' ? search.method : undefined,
		};
	},
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


function FetcherPage() {
	const { data: access, isLoading: checkingAccess } = useCurlAccess();
	const { history, isLoading: loadingHistory, deleteQueryRecord, isDeleting } = useFetcherHistory();
	const navigate = useNavigate({ from: '/fetcher' });
	const search = useSearch({ from: '/fetcher' });
	const [activeQuery, setActiveQuery] = useState<QueryRecord | undefined>();
	const [editingQuery, setEditingQuery] = useState<QueryRecord | undefined>();
	const [curlInput, setCurlInput] = useState('');
	const lastClipboardContent = useRef<string | null>(null);

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

	// Derive active filter from query params - memoized to prevent re-renders
	const activeFilter = useMemo(() => {
		return search.method ? { id: 'method', value: search.method } : null;
	}, [search.method]);

	const handleFilterChange = useCallback((filter: { id: string; value: string } | null) => {
		navigate({
			to: '.',
			search: filter ? { method: filter.value } : {},
		});
	}, [navigate]);

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


	const handleDelete = useCallback((id: string) => {
		if (confirm('¿Estás seguro de que quieres eliminar esta query del historial?')) {
			deleteQueryRecord(id);
		}
	}, [deleteQueryRecord]);

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
					className="w-80 px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 font-mono transition-shadow"
				/>
			</div>
			<ActionButton
				action={ACTION_DEFINITIONS.send}
				onClick={handleSendCurl}
				disabled={!isCurlValid}
				size="md"
				className="bg-primary text-primary-foreground hover:bg-primary/90"
			/>
		</form>
	);

	return (
		<PageLayout 
			header={{ title: "Fetcher" }}
			actions={[headerActions]}
		>
			<div className="space-y-6">
			{/* Content */}
			{checkingAccess ? (
				<StatusCard type="loading" message="Verificando acceso a curl..." />
			) : access?.hasAccess ? (
				loadingHistory ? (
					<StatusCard type="loading" message="Cargando historial..." />
				) : history.length === 0 ? (
					<div className="text-center py-20 bg-muted/10 rounded-xl border border-border/40 flex flex-col items-center justify-center">
						<div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
							<Send className="w-8 h-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-bold tracking-tight text-foreground">Historial Vacío</h3>
						<p className="text-muted-foreground max-w-xs mx-auto mt-1">
							Pega un comando cURL en la barra superior o copia uno al portapapeles para comenzar.
						</p>
					</div>
				) : (
					<QueriesTable
						queries={history}
						onOpenModal={handleOpenModal}
						onCopyResponse={handleCopyResponse}
						onCopyCurl={handleCopyCurl}
						onDelete={handleDelete}
						isDeleting={isDeleting}
						activeFilter={activeFilter}
						onFilterChange={handleFilterChange}
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
	activeFilter,
	onFilterChange,
}: {
	queries: QueryRecord[]
	onOpenModal: (query: QueryRecord) => void
	onCopyResponse: (query: QueryRecord) => void
	onCopyCurl: (query: QueryRecord) => void
	onDelete: (id: string) => void
	isDeleting: boolean
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
}) {
	const columns: ColumnDef<QueryRecord>[] = useMemo(() => [
		{
			accessorKey: "url",
			header: "URL",
			cell: ({ row }) => <UrlCell query={row.original} />,
		},
		{
			id: "method",
			accessorFn: (row) => {
				const parsed = parseCurlForDisplay(row.curl);
				return parsed?.method || '';
			},
			header: "Método",
			cell: ({ row }) => <MethodCell query={row.original} />,
			filterFn: 'equalsString',
		},
		{
			accessorKey: "updatedAt",
			header: "Enviado",
			cell: ({ row }) => <SentCell query={row.original} />,
		},
		{
			accessorKey: "responseTime",
			header: "Tiempo",
			cell: ({ row }) => <ResponseTimeCell query={row.original} />,
		},
		{
			id: "status",
			accessorFn: (row) => row.response?.status || null,
			header: "Status",
			cell: ({ row }) => <StatusCell query={row.original} />,
		},
		{
			id: "actions",
			accessorKey: "actions",
			header: "Acciones",
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
			filters={[
				{ label: 'GET', columnId: 'method', value: 'GET' },
				{ label: 'POST', columnId: 'method', value: 'POST' },
				{ label: 'PATCH', columnId: 'method', value: 'PATCH' },
				{ label: 'PUT', columnId: 'method', value: 'PUT' },
			]}
			activeFilter={activeFilter}
			onFilterChange={onFilterChange}
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

	const style = methodStyles[parsed.method.toUpperCase()] || "bg-muted text-muted-foreground border-border/60"

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
		<span className="text-sm text-muted-foreground">
			{parsed.domain}{fullPath}
		</span>
	)
}

function SentCell({ query }: { query: QueryRecord }) {
	return (
		<span className="text-sm text-muted-foreground" title={query.updatedAt ? formatTimeAgo(query.updatedAt) : 'Nunca'}>
			{query.updatedAt ? formatTimeAgo(query.updatedAt) : 'Nunca'}
		</span>
	)
}

function StatusCell({ query }: { query: QueryRecord }) {
	if (query.response?.status) {
		const { status } = query.response
		let style = "bg-muted text-muted-foreground border-border/60"
		if (status >= 200 && status < 300) style = "bg-success/20 text-success border-success/20"
		else if (status >= 400 && status < 500) style = "bg-warning/20 text-warning border-warning/20"
		else if (status >= 500) style = "bg-destructive/20 text-destructive border-destructive/20"

		return (
			<span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style}`}>
				{status}
			</span>
		)
	}
	return <span className="text-muted-foreground text-xs">-</span>
}

function ResponseTimeCell({ query }: { query: QueryRecord }) {
	if (query.response?.responseTime) {
		const { responseTime } = query.response
		let style = "bg-muted text-muted-foreground border-border/60"
		if (responseTime < 200) style = "bg-success/20 text-success border-success/20"
		else if (responseTime > 1000) style = "bg-destructive/20 text-destructive border-destructive/20"

		return (
			<span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style}`}>
				{responseTime}ms
			</span>
		)
	}
	return <span className="text-muted-foreground text-xs">-</span>
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
	onDelete: (id: string) => void
	isDeleting: boolean
}) {
	return (
		<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
			<ActionButton
				action={ACTION_DEFINITIONS.send}
				onClick={() => onOpenModal(query)}
				size="sm"
				className="text-success hover:bg-success/10"
			/>
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
			<ActionButton
				action={ACTION_DEFINITIONS.delete}
				onClick={() => onDelete(query.id)}
				disabled={isDeleting}
				size="sm"
			/>
		</div>
	)
}
