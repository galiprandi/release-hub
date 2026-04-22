import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"

interface RefetchButtonProps {
	onRefetch: () => void | Promise<unknown>
	isRefetching: boolean
	targetTime?: number // Timestamp objetivo
	showFeedback?: boolean
	className?: string
}

export function RefetchButton({
	onRefetch,
	isRefetching,
	targetTime,
	showFeedback = true,
	className = "",
}: RefetchButtonProps) {
	// Calcular tiempo inicial usando lazy initialization para evitar Date.now() durante render
	const [displayTime, setDisplayTime] = useState(() => {
		if (!targetTime) return 0
		return Math.abs(Math.floor((targetTime - Date.now()) / 1000))
	})

	useEffect(() => {
		if (!targetTime || !showFeedback) return

		const interval = setInterval(() => {
			const now = Date.now()
			const diff = Math.abs(Math.floor((targetTime - now) / 1000))
			setDisplayTime(diff)
		}, 1000)

		return () => clearInterval(interval)
	}, [targetTime, showFeedback])

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		if (mins > 0) {
			return `${mins}m ${secs}s`
		}
		return `${secs}s`
	}

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<button
				type="button"
				onClick={() => onRefetch()}
				disabled={isRefetching}
				className="flex items-center gap-1 rounded-sm px-2 py-1 border border-transparent opacity-70 hover:opacity-100 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				title="Recargar"
			>
				{showFeedback && targetTime && (
					<span className="text-xs h-4 flex items-center">{formatTime(displayTime)}</span>
				)}
				<RefreshCw className={`w-3 h-3 ${isRefetching ? "animate-spin" : ""}`} />
			</button>
		</div>
	)
}
