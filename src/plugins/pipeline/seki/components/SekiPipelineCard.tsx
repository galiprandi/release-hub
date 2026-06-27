/**
 * Seki Pipeline Card Component
 * Card para mostrar el estado del pipeline de Seki.
 */

import { Loader2, AlertTriangle } from 'lucide-react'
import type { MetaPart } from '../types'

/** Visual style mode for the card, derived from refType */
type CardViewMode = 'commits' | 'tags'

export interface SekiPipelineCardProps {
	viewMode: CardViewMode
	displayRef: string
	refType: 'COMMIT' | 'TAG'
	isRunning?: boolean
	hasError?: boolean
	onViewError?: () => void
	metaParts: MetaPart[]
	children?: React.ReactNode
	className?: string
}

const viewModeStyles: Record<CardViewMode, { badge: string; accent: string }> = {
	tags: {
		badge: "bg-purple-50 text-purple-700 border border-purple-100",
		accent: "bg-purple-500",
	},
	commits: {
		badge: "bg-blue-50 text-blue-600 border border-blue-100",
		accent: "bg-blue-500",
	},
}

export function SekiPipelineCard({
	viewMode,
	displayRef,
	refType,
	isRunning = false,
	hasError = false,
	onViewError,
	metaParts,
	children,
	className = '',
}: SekiPipelineCardProps) {
	const style = viewModeStyles[viewMode]

	return (
		<div
			className={`bg-card border rounded-xl p-4 transition-all duration-500 ${
				isRunning ? 'ring-1 ring-blue-400/20 bg-blue-50/5 dark:bg-blue-900/5' : ''
			} ${className}`}
		>
			<div className="flex items-start gap-4">
				<div
					className={`w-1 rounded-full self-stretch ${
						isRunning ? 'bg-blue-400 animate-pulse-slow' : style.accent
					}`}
				/>
				<div className="flex-1 min-w-0 space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="font-mono text-base font-semibold text-foreground">{displayRef}</span>
							<span className={`px-1.5 py-0 text-[10px] rounded uppercase tracking-wide ${style.badge}`}>
								{refType}
							</span>
							{isRunning ? (
								<span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-md animate-pulse-slow">
									<Loader2 className="w-3 h-3 animate-spin" />
									EN PROGRESO
								</span>
							) : hasError && onViewError ? (
								<button
									type="button"
									onClick={onViewError}
									className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none focus-visible:ring-offset-1"
								>
									<AlertTriangle className="w-3 h-3" />
									Ver error
								</button>
							) : null}
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
