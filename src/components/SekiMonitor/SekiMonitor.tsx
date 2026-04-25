import { GitCommit, Loader2, XCircle, X, AlertTriangle, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import DayJS from "@/lib/dayjs";
import { Streamdown } from "streamdown";

import {
	flattenSubEvents,
	severityRank,
} from "./helpers";
import { MiniTimeline } from "./MiniTimeline";
import type { MetaPart, SekiMonitorProps } from "./types";
import type { FlattenedSubEvent } from "./helpers";
import { PipelineCard } from "@/components/pipeline/PipelineCard";

function ErrorCard({ sub, parent }: FlattenedSubEvent) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="border border-red-200 bg-red-50/70 rounded-lg overflow-hidden transition-all duration-200">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full text-left p-2 flex items-center justify-between hover:bg-red-100/50 transition-colors"
			>
				<div className="text-sm font-medium text-red-700 flex items-center gap-2">
					<XCircle className="w-3.5 h-3.5" />
					<span>
						{parent.label.es} · {sub.label}
					</span>
				</div>
				<span className="text-[10px] text-red-600 font-medium bg-red-100 px-2 py-0.5 rounded">
					{isExpanded ? "Ocultar" : "Ver detalle"}
				</span>
			</button>
			{isExpanded && sub.markdown && (
				<div className="p-3 bg-white border-t border-red-200 prose prose-sm max-w-none dark:prose-invert overflow-auto max-h-96 shadow-inner">
					<Streamdown>{sub.markdown}</Streamdown>
				</div>
			)}
		</div>
	);
}

interface StatusCardProps {
	type: 'loading' | 'error' | 'warn' | 'offline';
	message: string;
	onClose?: () => void;
	onRetry?: () => void;
}

function StatusCard({ type, message, onClose, onRetry }: StatusCardProps) {
	const styles = {
		loading: {
			borderClass: 'border-gray-200',
			textClass: 'text-gray-600',
			icon: Loader2,
			iconClass: 'animate-spin',
		},
		error: {
			borderClass: 'border-red-200',
			textClass: 'text-red-600',
			icon: XCircle,
			iconClass: '',
		},
		warn: {
			borderClass: 'border-amber-200',
			textClass: 'text-amber-700',
			icon: AlertTriangle,
			iconClass: '',
		},
		offline: {
			borderClass: 'border-gray-300',
			textClass: 'text-gray-500',
			icon: WifiOff,
			iconClass: '',
		},
	};

	const style = styles[type];
	const Icon = style.icon;

	return (
		<div className={`bg-card border-2 ${style.borderClass} rounded-xl p-4 h-[82px] flex items-center justify-between`}>
			<div className="flex items-center gap-2 text-sm">
				<Icon className={`w-4 h-4 ${style.iconClass} ${style.textClass}`} />
				<p className={style.textClass}>{message}</p>
			</div>
			<div className="flex items-center gap-2">
				{onRetry && type === 'error' && (
					<button
						type="button"
						onClick={onRetry}
						className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition-colors"
					>
						Reintentar
					</button>
				)}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground transition-colors"
						title="Cerrar"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}

export function SekiMonitor({ pipeline, viewMode, gitDate, isLoading, error }: SekiMonitorProps) {
	const [dismissedError, setDismissedError] = useState(false);
	const [dismissedWarn, setDismissedWarn] = useState(false);
	const [isOffline, setIsOffline] = useState(!navigator.onLine);

	useEffect(() => {
		const handleOnline = () => setIsOffline(false);
		const handleOffline = () => setIsOffline(true);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	if (isOffline) {
		return <StatusCard type="offline" message="Sin conexión a internet. Verifica tu conexión." />;
	}

	if (isLoading) {
		return <StatusCard type="loading" message="Cargando información del pipeline..." />;
	}

	if (error && !dismissedError) {
		return (
			<StatusCard
				type="error"
				message={`Error al cargar el pipeline: ${error.message}`}
				onClose={() => setDismissedError(true)}
				onRetry={() => window.location.reload()}
			/>
		);
	}

	if (!pipeline && !dismissedWarn) {
		return <StatusCard type="warn" message="Información de Pipeline no disponible." onClose={() => setDismissedWarn(true)} />;
	}

	// Si pipeline es null después de todos los checks, no renderizar nada
	if (!pipeline) {
		return null;
	}

	// Mostrar tag en vista de tags, commit hash en vista de commits
	const displayRef = viewMode === "tags" && pipeline.git.ref
		? pipeline.git.ref
		: pipeline.git.commit.slice(0, 7);

	// Usar gitDate si está disponible para consistencia con la tabla, sino usar fecha del pipeline
	const dateToUse = gitDate || pipeline.updated_at;
	const lastUpdated = DayJS(dateToUse).fromNow();
	const subEvents = flattenSubEvents(pipeline.events);
	const failedSubEvents = subEvents.filter(
		(item) => item.sub.state === "FAILED",
	);
	const sortedEvents = [...pipeline.events].sort(
		(a, b) => severityRank(a.state) - severityRank(b.state),
	);
	const runningEvent = sortedEvents.find(
		(e) => e.state === "STARTED" || e.state === "RUNNING"
	);
	const isRunning = pipeline.state === "STARTED";

	const metaParts: MetaPart[] = [];

	if (pipeline.git.commit_author) {
		metaParts.push({
			id: "author",
			node: (
				<span className="font-medium text-foreground">
					{pipeline.git.commit_author}
				</span>
			),
		});
	}

	if (lastUpdated) {
		metaParts.push({
			id: "time",
			node: <span>{lastUpdated}</span>,
		});
	}

	if (pipeline.git.commit_message) {
		metaParts.push({
			id: "commit",
			node: (
				<span className="inline-flex items-center gap-1 text-foreground">
					<GitCommit className="w-3.5 h-3.5" />
					{pipeline.git.commit_message}
				</span>
			),
		});
	}

	return (
		<div className="space-y-2">
			<PipelineCard
				viewMode={viewMode}
				displayRef={displayRef}
				refType={viewMode === "commits" ? "COMMIT" : "TAG"}
				isRunning={isRunning}
				metaParts={metaParts}
			>
				<MiniTimeline events={sortedEvents} runningEventId={runningEvent?.id} />
			</PipelineCard>

			{failedSubEvents.length > 0 && (
				<div className="space-y-2">
					{failedSubEvents.map(({ sub, parent }) => (
						<ErrorCard key={sub.id} sub={sub} parent={parent} />
					))}
				</div>
			)}
		</div>
	);
}
