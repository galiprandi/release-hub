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
import { BaseDialog } from "@/components/ui/BaseDialog";
import DayJS from "@/lib/dayjs";

const timelineStatusTextColor = (state: string) => {
	switch (state) {
		case "SUCCESS":
			return "text-success";
		case "FAILED":
			return "text-destructive";
		case "WARN":
			return "text-warning";
		case "RUNNING":
		case "PENDING":
		case "STARTED":
			return "text-info";
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
			return "bg-success";
		case "FAILED":
			return "bg-destructive";
		case "WARN":
			return "bg-warning";
		case "RUNNING":
		case "PENDING":
		case "STARTED":
			return "bg-info animate-pulse-slow shadow-[0_0_8px_rgba(var(--color-info),0.4)]";
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

/**
 * Limpia una URL extraída de markdown, removiendo tags HTML y caracteres no deseados
 */
const cleanUrl = (url: string): string => {
	return url
		.replace(/<\/[^>]+>$/g, '') // Remover </tag> al final
		.replace(/<[^>]+>$/g, '')  // Remover <tag> al final
		.replace(/"$/, '');        // Remover comillas al final
};

/**
 * Verifica si una URL es externa (accesible desde el navegador)
 * Las URLs internas tipo *.svc.cluster.local no son accesibles desde fuera del cluster
 */
const isExternalUrl = (url: string): boolean => {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname;
		if (hostname.includes('.svc.cluster.local')) return false;
		if (hostname.includes('.svc.') || hostname.endsWith('.local')) return false;
		return true;
	} catch {
		return false;
	}
};

const extractEventUrls = (event: Event) => {
	const urls = new Set<string>();
	const ROUTE_REGEX = /https?:\/\/[^\s"']+/g;

	// Check event markdown
	if (event.markdown) {
		const matches = event.markdown.match(ROUTE_REGEX);
		if (matches) {
			matches.forEach((match) => {
				const url = cleanUrl(match);
				if (isExternalUrl(url)) urls.add(url);
			});
		}
	}

	// Check subevents markdown
	event.subevents.forEach((sub) => {
		if (sub.markdown) {
			const matches = sub.markdown.match(ROUTE_REGEX);
			if (matches) {
				matches.forEach((match) => {
					const url = cleanUrl(match);
					if (isExternalUrl(url)) urls.add(url);
				});
			}
		}
	});

	return Array.from(urls);
};

interface MiniTimelineProps {
	events: Event[];
	runningEventId?: string; // ID del evento que está corriendo para mantener su tooltip abierto
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
			className={`p-1 text-xs rounded-md transition-all border ${
				copied
					? "bg-success/10 text-success border-success/20"
					: "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent hover:border-border"
			} focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none`}
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

export function MiniTimeline({ events, runningEventId }: MiniTimelineProps) {
	const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
	const [selectedSubEvent, setSelectedSubEvent] = useState<{ id: string; label: string; markdown: string } | null>(null);
	const [runningTooltipClosed, setRunningTooltipClosed] = useState(false);

	return (
		<>
			<div className="flex items-start gap-1">
				{events.map((event) => {
					const eventUrls = extractEventUrls(event);
					const isRunning = event.state === "STARTED" || event.state === "RUNNING";
					const isRunningEvent = runningEventId === event.id && isRunning;
					const isOpen = hoveredEventId === event.id || (isRunningEvent && !hoveredEventId && !runningTooltipClosed);
					return (
						<HoverCard
							key={event.id}
							openDelay={100}
							closeDelay={100}
							open={isOpen}
							onOpenChange={(open) => {
								if (open) {
									setHoveredEventId(event.id);
								} else {
									setHoveredEventId(null);
									// Si se cierra el tooltip del running event, marcarlo como cerrado manualmente
									if (isRunningEvent) {
										setRunningTooltipClosed(true);
									}
								}
							}}
						>
							<HoverCardTrigger asChild>
								<button
									type="button"
									onClick={() => {
										// Si es el running event y está abierto manualmente, cerrarlo
										if (isRunningEvent && !runningTooltipClosed) {
											setRunningTooltipClosed(true);
										}
									}}
									className={`h-2.5 w-8 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-md focus-visible:scale-110 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${timelineStatusColor(
										event.state,
									)}`}
									aria-label={`Evento: ${event.label.es}, Estado: ${event.state}`}
								/>
							</HoverCardTrigger>
							<HoverCardContent
								align="center"
								sideOffset={8}
								className="p-0 w-fit min-w-[320px] max-w-[90vw] max-h-[80vh] overflow-hidden shadow-xl border-border/50"
							>
								<div className="p-4 space-y-4">
									<div className="flex items-center justify-between gap-4">
										<div className="flex items-center gap-2.5">
											<div className={`p-1.5 rounded-lg ${timelineStatusColor(event.state)}/10`}>
												{timelineStatusIcon(event.state)}
											</div>
											<span
												className={`text-sm font-bold tracking-tight ${timelineStatusTextColor(
													event.state,
												)}`}
											>
												{event.label.es}
											</span>
										</div>
										<div className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
											{`${DayJS(event.updated_at || event.created_at).fromNow()} (${formatDuration(
												event.created_at,
												event.updated_at,
											)})`}
										</div>
									</div>
									{event.subevents && event.subevents.length > 0 && (
										<div className="border-t border-border/40 pt-3">
											<div className="flex items-center gap-3 mb-3">
												<div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
													<div
														className="h-full bg-success transition-all duration-500 shadow-[0_0_8px_rgba(var(--color-success),0.2)]"
														style={{
															width: `${(event.subevents.filter(s => ['SUCCESS', 'FAILED', 'WARN'].includes(s.state)).length / event.subevents.length) * 100}%`,
														}}
													/>
												</div>
												<span className="text-[10px] font-bold text-muted-foreground tabular-nums">
													{event.subevents.filter(s => ['SUCCESS', 'FAILED', 'WARN'].includes(s.state)).length}/{event.subevents.length}
												</span>
											</div>
											<div className="space-y-0.5">
												{event.subevents.map((sub) => (
													<div key={sub.id}>
														<button
															type="button"
															className="flex items-center gap-2.5 text-[11px] p-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors w-full text-left focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
															onClick={() => sub.markdown && setSelectedSubEvent({ id: sub.id, label: sub.label, markdown: sub.markdown })}
															disabled={!sub.markdown}
														>
															<div className="flex-shrink-0">
																{timelineStatusIcon(sub.state)}
															</div>
															<span className={`flex-1 font-medium ${timelineStatusTextColor(sub.state)}`}>
																{sub.label}
															</span>
															<span className="text-muted-foreground/70 tabular-nums">
																{formatDuration(sub.created_at, sub.updated_at)}
															</span>
															{sub.markdown && (
																<span className="text-[10px] opacity-60 ml-1">📄</span>
															)}
														</button>
													</div>
												))}
											</div>
										</div>
									)}
									{eventUrls.length > 0 && (
										<div className="border-t border-border/40 pt-3">
											<div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
												URLs relacionadas
											</div>
											<div className="space-y-1.5 max-w-[280px]">
												{eventUrls.map((url) => (
													<div key={url} className="flex items-center gap-1.5">
														<a
															href={url}
															target="_blank"
															rel="noreferrer"
															className="inline-flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-muted/40 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all flex-1 min-w-0 border border-transparent hover:border-primary/20"
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
										<div className="border-t border-border/40 pt-3 prose prose-sm max-w-none dark:prose-invert text-[11px] leading-relaxed">
											<Streamdown>{event.markdown}</Streamdown>
										</div>
									)}
								</div>
							</HoverCardContent>
						</HoverCard>
					);
				})}
			</div>
			<BaseDialog
				open={!!selectedSubEvent}
				onOpenChange={(open) => !open && setSelectedSubEvent(null)}
				title={selectedSubEvent?.label}
				description="Detalles del sub-evento"
				maxWidth="max-w-4xl"
			>
				<div className="flex-1 overflow-y-auto pr-2 prose prose-sm max-w-none dark:prose-invert">
					{selectedSubEvent?.markdown && (
						<Streamdown>{selectedSubEvent.markdown}</Streamdown>
					)}
				</div>
			</BaseDialog>
		</>
	);
}
