import { GitCommit, Loader2, XCircle } from "lucide-react";
import { Fragment, useState } from "react";
import DayJS from "@/lib/dayjs";
import { Streamdown } from "streamdown";

import {
	flattenSubEvents,
	severityRank,
	stageStyles,
} from "./helpers";
import { MiniTimeline } from "./MiniTimeline";
import type { MetaPart, SekiMonitorProps } from "./types";
import type { FlattenedSubEvent } from "./helpers";

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

export function SekiMonitor({ pipeline, stage, gitDate }: SekiMonitorProps) {
	if (!pipeline) {
		return (
			<div className="bg-card border rounded-xl p-4 h-[82px] flex items-center justify-center">
				<p className="text-sm text-muted-foreground">
					Información de Pipeline no disponible para este Stage.
				</p>
			</div>
		);
	}

	// Mostrar tag en producción, commit hash en staging
	const displayRef = stage === "production" && pipeline.git.ref
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
	const metaParts: MetaPart[] = [];
	const stageStyle = stageStyles[stage];

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

	const isRunning = pipeline.state === "STARTED";

	return (
		<div className="space-y-2">
			<div className={`bg-card border rounded-xl p-4 h-[82px] space-y-4 transition-all duration-500 ${isRunning ? 'ring-1 ring-blue-400/20 bg-blue-50/5 dark:bg-blue-900/5' : ''}`}>
				<div className="flex flex-wrap items-start gap-4">
					<div
						className={`w-1 rounded-full self-stretch hidden sm:block ${isRunning ? 'bg-blue-400 animate-pulse-slow' : stageStyle.accent}`}
					/>
					<div className="flex-1 min-w-[220px] space-y-2">
						<div className="flex items-center gap-2">
							<span className="font-mono text-base font-semibold text-foreground">
								{displayRef}
							</span>
							<span
								className={`px-2 py-0.5 text-[11px] rounded-full uppercase tracking-wide ${stageStyle.badge}`}
							>
								{stage === "staging" ? "COMMIT" : "TAG"}
							</span>
							{isRunning && (
								<span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-md animate-pulse-slow">
									<Loader2 className="w-3 h-3 animate-spin" />
									EN PROGRESO
								</span>
							)}
						</div>
						{metaParts.length > 0 && (
							<div className="text-xs text-muted-foreground flex items-center gap-2 whitespace-nowrap overflow-hidden">
								{metaParts.map(({ id, node }, index) => (
									<Fragment key={id}>
										{index > 0 && <span>·</span>}
										{node}
									</Fragment>
								))}
							</div>
						)}
					</div>
					<div className="flex flex-col gap-2 min-w-[200px] items-end">
						<div className="self-end">
							<MiniTimeline events={sortedEvents} />
						</div>
					</div>
				</div>

				{/* Warning details now surface via stage hover only */}
			</div>

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
