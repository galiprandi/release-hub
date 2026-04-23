import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	ExternalLink,
	Loader2,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import type { Event } from "@/api/seki.type";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import DayJS from "@/lib/dayjs";

const timelineStatusTextColor = (state: string) => {
	switch (state) {
		case "SUCCESS":
			return "text-emerald-600";
		case "FAILED":
			return "text-red-600";
		case "WARN":
			return "text-amber-600";
		case "RUNNING":
		case "PENDING":
		case "STARTED":
			return "text-blue-600";
		default:
			return "text-muted-foreground";
	}
};

const timelineStatusIcon = (state: string) => {
	const baseClass = `w-3 h-3 ${timelineStatusTextColor(state)}`;
	switch (state) {
		case "SUCCESS":
			return <CheckCircle2 className={baseClass} />;
		case "FAILED":
			return <XCircle className={baseClass} />;
		case "WARN":
			return <AlertTriangle className={baseClass} />;
		case "RUNNING":
		case "PENDING":
		case "STARTED":
			return <Loader2 className={`${baseClass} animate-spin`} />;
		default:
			return null;
	}
};

const timelineStatusColor = (state: string) => {
	switch (state) {
		case "SUCCESS":
			return "bg-green-500";
		case "FAILED":
			return "bg-red-500";
		case "WARN":
			return "bg-amber-500";
		case "RUNNING":
		case "PENDING":
		case "STARTED":
			return "bg-blue-500 animate-pulse-slow shadow-[0_0_8px_rgba(59,130,246,0.4)]";
		default:
			return "bg-muted";
	}
};

const formatDuration = (start: string, end?: string) => {
	const startDate = DayJS(start);
	const endDate = end ? DayJS(end) : DayJS();
	const diffSecs = Math.max(0, endDate.diff(startDate, "second"));
	const mins = Math.floor(diffSecs / 60);
	const secs = diffSecs % 60;
	return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const extractEventUrls = (event: Event) => {
	const urls = new Set<string>();
	const ROUTE_REGEX = /https?:\/\/[^\s"']+/g;

	// Check event markdown
	if (event.markdown) {
		const matches = event.markdown.match(ROUTE_REGEX);
		if (matches) {
			matches.forEach((match) => {
				urls.add(match.replace(/"$/, ""));
			});
		}
	}

	// Check subevents markdown
	event.subevents.forEach((sub) => {
		if (sub.markdown) {
			const matches = sub.markdown.match(ROUTE_REGEX);
			if (matches) {
				matches.forEach((match) => {
					urls.add(match.replace(/"$/, ""));
				});
			}
		}
	});

	return Array.from(urls);
};

interface MiniTimelineProps {
	events: Event[];
}

interface CopyButtonProps {
	url: string;
}

function CopyButton({ url }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy URL:", err);
		}
	};

	return (
		<button
			type="button"
			onClick={handleCopy}
			className={`p-1 text-xs rounded transition-colors ${
				copied
					? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
					: "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
			}`}
			title={copied ? "¡Copiado!" : "Copiar URL"}
		>
			{copied ? (
				<svg
					className="w-3 h-3"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-label="URL copied successfully"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M5 13l4 4L19 7"
					/>
				</svg>
			) : (
				<Copy className="w-3 h-3" aria-label="Copy URL" />
			)}
		</button>
	);
}

export function MiniTimeline({ events }: MiniTimelineProps) {
	return (
		<div className="flex gap-0.5">
			{events.map((event) => {
				const eventUrls = extractEventUrls(event);
				return (
					<HoverCard key={event.id} openDelay={100} closeDelay={100}>
						<HoverCardTrigger asChild>
							<button
								type="button"
								className={`h-1.5 w-6 rounded-full transition-all hover:opacity-80 ${timelineStatusColor(
									event.state,
								)}`}
							/>
						</HoverCardTrigger>
						<HoverCardContent
							side="top"
							align="center"
							sideOffset={6}
							className="p-4 w-fit min-w-[300px] max-w-[90vw]"
						>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									{timelineStatusIcon(event.state)}
									<span
										className={`text-sm font-semibold ${timelineStatusTextColor(
											event.state,
										)}`}
									>
										{event.label.es}
									</span>
								</div>
								<div className="text-xs text-muted-foreground border-t pt-2">
									{`${DayJS(event.updated_at || event.created_at).fromNow()} (${formatDuration(
										event.created_at,
										event.updated_at,
									)})`}
								</div>
								{eventUrls.length > 0 && (
									<div className="border-t pt-2">
										<div className="text-xs font-medium text-foreground mb-2">
											URLs relacionadas:
										</div>
										<div className="space-y-1 max-w-[250px]">
											{eventUrls.map((url) => (
												<div key={url} className="flex items-center gap-1">
													<a
														href={url}
														target="_blank"
														rel="noreferrer"
														className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition flex-1 min-w-0"
													>
														<ExternalLink className="w-3 h-3 flex-shrink-0" />
														<span className="truncate">{url}</span>
													</a>
													<CopyButton url={url} />
												</div>
											))}
										</div>
									</div>
								)}
								{event.markdown && (
									<div className="border-t pt-2 prose prose-sm max-w-none dark:prose-invert">
										<Streamdown>{event.markdown}</Streamdown>
									</div>
								)}
							</div>
						</HoverCardContent>
					</HoverCard>
				);
			})}
		</div>
	);
}
