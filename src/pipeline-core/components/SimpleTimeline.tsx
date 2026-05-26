/**
 * Simple Timeline Component
 * Displays pipeline events as a visual timeline
 * Works with unified PipelineEvent type
 */

import {
	AlertTriangle,
	CheckCircle2,
	Loader2,
	XCircle,
} from "lucide-react"
import { useState } from "react"
import type { PipelineEvent, PipelineState } from '../types'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card"
import DayJS from "@/lib/dayjs"

interface SimpleTimelineProps {
	events: PipelineEvent[]
}

const timelineStatusTextColor = (state: PipelineState) => {
	switch (state) {
		case "COMPLETED":
			return "text-success"
		case "FAILED":
			return "text-destructive"
		case "CANCELLED":
			return "text-warning"
		case "RUNNING":
		case "STARTED":
			return "text-info"
		default:
			return "text-muted-foreground"
	}
}

const timelineStatusIcon = (state: PipelineState) => {
	const baseClass = `w-3 h-3 ${timelineStatusTextColor(state)}`
	switch (state) {
		case "COMPLETED":
			return <CheckCircle2 className={baseClass} />
		case "FAILED":
			return <XCircle className={baseClass} />
		case "CANCELLED":
			return <AlertTriangle className={baseClass} />
		case "RUNNING":
		case "STARTED":
			return <Loader2 className={`${baseClass} animate-spin`} />
		default:
			return null
	}
}

const timelineStatusColor = (state: PipelineState) => {
	switch (state) {
		case "COMPLETED":
			return "bg-success"
		case "FAILED":
			return "bg-destructive"
		case "CANCELLED":
			return "bg-warning"
		case "RUNNING":
		case "STARTED":
			return "bg-info animate-pulse-slow shadow-[0_0_8px_rgba(var(--info),0.4)]"
		default:
			return "bg-muted"
	}
}

const formatDuration = (start?: string, end?: string) => {
	if (!start) return undefined
	const startDate = DayJS(start)
	const endDate = end ? DayJS(end) : DayJS()
	const diffSecs = Math.max(0, endDate.diff(startDate, "second"))
	const mins = Math.floor(diffSecs / 60)
	const secs = diffSecs % 60
	return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

export function SimpleTimeline({ events }: SimpleTimelineProps) {
	const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

	// Only show first 6 events to avoid overflow
	const displayEvents = events.slice(0, 6)

	return (
		<div className="flex items-start gap-0.5">
			{displayEvents.map((event) => {
				const isRunning = event.state === "STARTED" || event.state === "RUNNING"
				const isOpen = hoveredEventId === event.id
				const duration = formatDuration(event.startedAt, event.completedAt)
				
				return (
					<HoverCard
						key={event.id}
						openDelay={100}
						closeDelay={100}
						open={isOpen}
						onOpenChange={(open) => {
							setHoveredEventId(open ? event.id : null)
						}}
					>
						<HoverCardTrigger asChild>
							<button
								type="button"
								className={`h-1.5 w-6 rounded-full transition-all hover:opacity-80 ${timelineStatusColor(
									event.state,
								)}`}
							/>
						</HoverCardTrigger>
						<HoverCardContent
							align="center"
							sideOffset={6}
							className="p-3 w-fit min-w-[200px]"
						>
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										{timelineStatusIcon(event.state)}
										<span
											className={`text-sm font-semibold ${timelineStatusTextColor(
												event.state,
											)}`}
										>
											{event.name}
										</span>
									</div>
									{isRunning && (
										<span className="text-xs text-info animate-pulse">
											en progreso
										</span>
									)}
								</div>
								{duration && (
									<div className="text-xs text-muted-foreground">
										Duración: {duration}
									</div>
								)}
								{event.startedAt && (
									<div className="text-xs text-muted-foreground">
										{DayJS(event.startedAt).fromNow()}
									</div>
								)}
							</div>
						</HoverCardContent>
					</HoverCard>
				)
			})}
			{events.length > 6 && (
				<span className="text-xs text-muted-foreground ml-1">
					+{events.length - 6} más
				</span>
			)}
		</div>
	)
}
