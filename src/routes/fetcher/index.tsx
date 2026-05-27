import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, useMemo, useCallback, useEffect } from 'react';
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
import DayJS from '@/lib/dayjs';

export const Route = createFileRoute('/fetcher/')({
	component: FetcherPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			method: typeof search.method === 'string' ? search.method : undefined,
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

	useEffect(() => {
		if (access && !access.isInstalled) {
			navigate({ to: '/fetcher/setup' });
		}
	}, [access, navigate]);

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
					<div className="text-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
						<Send className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
						<p className="text-muted-foreground">No hay queries en el historial</p>
						<p className="text-sm text-muted-foreground mt-1">
							Importa un comando cURL para comenzar
						</p>
					</div>
				) : (
					<QueriesTable
						queries={history}
						onOpenModal={handleOpenModal}
						onCopyResponse={handleCopyResponse}
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
	onDelete,
	isDeleting,
	activeFilter,
	onFilterChange,
}: {
	queries: QueryRecord[]
	onOpenModal: (query: QueryRecord) => void
	onCopyResponse: (query: QueryRecord) => void
	onDelete: (id: string) => void
	isDeleting: boolean
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
}) {
	const columns: ColumnDef<QueryRecord>[] = useMemo(() => [
		{
			accessorKey: "domain",
			header: "Dominio",
			cell: ({ row }) => <DomainCell query={row.original} />,
		},
		{
			accessorKey: "path",
			header: "Path",
			cell: ({ row }) => <PathCell query={row.original} />,
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
					onDelete={onDelete}
					isDeleting={isDeleting}
				/>
			),
		},
	], [onOpenModal, onCopyResponse, onDelete, isDeleting])

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
		GET: "bg-success/20 text-success",
		POST: "bg-info/20 text-info",
		PUT: "bg-warning/20 text-warning",
		PATCH: "bg-warning/20 text-warning",
		DELETE: "bg-destructive/20 text-destructive",
	}

	const style = methodStyles[parsed.method.toUpperCase()] || "bg-muted text-muted-foreground"

	return (
		<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style}`}>
			{parsed.method}
		</span>
	)
}

function PathCell({ query }: { query: QueryRecord }) {
	const parsed = parseCurlForDisplay(query.curl)
	if (!parsed) return null

	return (
		<span className="text-sm text-muted-foreground">
			{parsed.path.length > 100 ? `${parsed.path.slice(0, 100)}...` : parsed.path}
		</span>
	)
}

function DomainCell({ query }: { query: QueryRecord }) {
	const parsed = parseCurlForDisplay(query.curl)
	if (!parsed) return null

	return <span className="text-sm text-muted-foreground">{parsed.domain}</span>
}

function SentCell({ query }: { query: QueryRecord }) {
	return (
		<span className="text-sm text-muted-foreground" title={query.updatedAt ? DayJS(query.updatedAt).fromNow() : 'Nunca'}>
			{query.updatedAt ? DayJS(query.updatedAt).fromNow() : 'Nunca'}
		</span>
	)
}

function StatusCell({ query }: { query: QueryRecord }) {
	if (query.response?.status) {
		const { status } = query.response
		let style = "bg-muted text-muted-foreground"
		if (status >= 200 && status < 300) style = "bg-success/20 text-success"
		else if (status >= 400 && status < 500) style = "bg-warning/20 text-warning"
		else if (status >= 500) style = "bg-destructive/20 text-destructive"

		return (
			<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style}`}>
				{status}
			</span>
		)
	}
	return <span className="text-muted-foreground text-xs">-</span>
}

function ResponseTimeCell({ query }: { query: QueryRecord }) {
	if (query.response?.responseTime) {
		const { responseTime } = query.response
		let style = "bg-muted text-muted-foreground"
		if (responseTime < 200) style = "bg-success/20 text-success"
		else if (responseTime > 1000) style = "bg-destructive/20 text-destructive"

		return (
			<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style}`}>
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
	onDelete,
	isDeleting,
}: {
	query: QueryRecord
	onOpenModal: (query: QueryRecord) => void
	onCopyResponse: (query: QueryRecord) => void
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
