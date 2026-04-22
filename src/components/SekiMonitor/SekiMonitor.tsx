import { GitCommit } from "lucide-react";
import { Fragment } from "react";
import DayJS from "@/lib/dayjs";

import {
	extractSummary,
	flattenSubEvents,
	severityRank,
	stageStyles,
} from "./helpers";
import { MiniTimeline } from "./MiniTimeline";
import type { MetaPart, SekiMonitorProps } from "./types";

export function SekiMonitor({ pipeline, stage }: SekiMonitorProps) {
	if (!pipeline) {
		return (
			<div className="bg-card border rounded-xl p-4">
				<p className="text-sm text-muted-foreground">
					No pipeline data available yet for this stage.
				</p>
			</div>
		);
	}

	const shortHash = pipeline.git.commit.slice(0, 7);
	const duration = DayJS(pipeline.updated_at).from(
		DayJS(pipeline.created_at),
		true,
	);
	const lastUpdated = DayJS(pipeline.updated_at).fromNow();
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
			node: (
				<span>
					{lastUpdated} ({duration})
				</span>
			),
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
		<div className="bg-card border rounded-xl p-4 space-y-4">
			<div className="flex flex-wrap items-start gap-4">
				<div
					className={`w-1 rounded-full self-stretch hidden sm:block ${stageStyle.accent}`}
				/>
				<div className="flex-1 min-w-[220px] space-y-2">
					<div className="flex items-center gap-2">
						<span className="font-mono text-base font-semibold text-foreground">
							{shortHash}
						</span>
						<span
							className={`px-2 py-0.5 text-[11px] rounded-full uppercase tracking-wide ${stageStyle.badge}`}
						>
							{stage.toUpperCase()}
						</span>
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

			{failedSubEvents.length > 0 && (
				<div className="space-y-2">
					{failedSubEvents.map(({ sub, parent }) => (
						<div
							key={sub.id}
							className="border border-red-200 bg-red-50/70 rounded-lg p-3"
						>
							<div className="text-sm font-medium text-red-700">
								{parent.label.es} · {sub.label}
							</div>
							<p className="text-sm text-red-800 mt-1">
								{extractSummary(sub.markdown)}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Warning details now surface via stage hover only */}
		</div>
	);
}
