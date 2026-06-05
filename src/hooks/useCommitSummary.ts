import { useCallback, useMemo, useState } from "react"
import { useAISummarize } from "@galiprandi/react-tools"

interface Commit {
	hash: string
	shortHash: string
	subject: string
	body: string
	message: string
	author: string
	date: string
}

interface UseCommitSummaryOptions {
	enabled?: boolean
}

export function useCommitSummary(options: UseCommitSummaryOptions = {}) {
	const { enabled = true } = options
	const [isGeneratingLocal, setIsGeneratingLocal] = useState(false)
	const { data, status, error: aiError, summarize, reset: resetAI } = useAISummarize({
		type: "key-points",
		format: "plain-text",
		length: "medium",
		outputLanguage: "en",
		streaming: true,
	})

	const availability = useMemo(() => 
		status === "initializing" || status === "downloading" ? "checking" :
		status === "idle" || status === "success" ? "available" : "unavailable",
		[status]
	)
	
	const isGenerating = isGeneratingLocal || status === "summarizing" || status === "initializing" || status === "downloading"
	const summary = data || ""

	const getStatusMessage = useMemo(() => {
		if (status === "initializing") return "Inicializando..."
		if (status === "downloading") return "Descargando..."
		if (status === "summarizing") return "Generando..."
		return "Generando..."
	}, [status])

	const generateCommitSummary = useCallback(
		async (commits: Commit[]): Promise<void> => {
			if (!enabled || availability !== "available" || commits.length === 0) {
				return
			}

			setIsGeneratingLocal(true)

			const commitsText = commits.map(
				c => `- ${c.shortHash}: ${c.subject} (${c.author})${c.body ? `\n  Body: ${c.body}` : ""}`
			).join('\n')

			const context = 'Generate release notes in English. Use category headers with emojis: 🐛 FIXES, ✨ FEATURES, 🎨 CHORES, ♻️ REFACTOR, 📝 DOCS. Format each bullet as: * short-hash: description. CRITICAL: Do NOT duplicate commits - each commit should appear once. Only use information from commit subjects. Do NOT add details not present in commits.'
			const textWithContext = `INSTRUCCIÓN: ${context}\n\n${commitsText}`

			try {
				await summarize(textWithContext, context)
			} catch (err) {
				console.error('[useCommitSummary] Error generating summary:', err)
			} finally {
				setIsGeneratingLocal(false)
			}
		},
		[enabled, availability, summarize],
	)

	const reset = useCallback(() => {
		setIsGeneratingLocal(false)
		resetAI()
	}, [resetAI])

	return {
		generateCommitSummary,
		isGenerating,
		summary,
		error: aiError?.message || null,
		reset,
		isAvailable: availability === "available" && enabled,
		status,
		getStatusMessage
	}
}

