/**
 * Pipeline Card Component
 * Reusable card for displaying pipeline status from any provider
 */

import { Loader2 } from 'lucide-react'
import type { ViewMode } from '../types'

export type MetaPart = {
	id: string
	node: React.ReactNode
}

export interface PipelineCardProps {
	viewMode: ViewMode
	displayRef: string
	refType: 'COMMIT' | 'TAG'
	isRunning?: boolean
	metaParts: MetaPart[]
	children?: React.ReactNode
	className?: string
}

const viewModeStyles: Record<ViewMode, { badge: string; accent: string }> = {
	tags: {
		badge: "bg-tag/10 text-tag border border-tag/20",
		accent: "bg-tag",
	},
	commits: {
		badge: "bg-commit/10 text-commit border border-commit/20",
		accent: "bg-commit",
	},
}

export function PipelineCard({
	viewMode,
	displayRef,
	refType,
	isRunning = false,
	metaParts,
	children,
	className = '',
}: PipelineCardProps) {
	const style = viewModeStyles[viewMode]

	return (
		<div
			className={`bg-card border rounded-xl p-4 transition-all duration-500 ${
				isRunning ? 'ring-1 ring-info/20 bg-info/5' : ''
			} ${className}`}
		>
			<div className="flex items-start gap-4">
				<div
					className={`w-1 rounded-full self-stretch ${
						isRunning ? 'bg-info animate-pulse-slow' : style.accent
					}`}
				/>
				<div className="flex-1 min-w-0 space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="font-mono text-base font-semibold text-foreground">{displayRef}</span>
							<span className={`px-1.5 py-0 text-[10px] rounded uppercase tracking-wide ${style.badge}`}>
								{refType}
							</span>
							{isRunning && (
								<span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-info/10 text-info border border-info/20 rounded-md animate-pulse-slow">
									<Loader2 className="w-3 h-3 animate-spin" />
									EN PROGRESO
								</span>
							)}
						</div>
						{children && <div className="self-start">{children}</div>}
					</div>
					{metaParts.length > 0 && (
						<div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
							{metaParts.map(({ id, node }, index) => (
								<span key={id}>
									{index > 0 && <span className="mx-2">·</span>}
									{node}
								</span>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
