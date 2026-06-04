import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAISummarize } from "@galiprandi/react-tools"

interface UseAIErrorProcessorOptions {
	enabled?: boolean
}

export function useAIErrorProcessor(options: UseAIErrorProcessorOptions = {}) {
	const { enabled = true } = options
	const queryClient = useQueryClient()
	const [isGeneratingLocal, setIsGeneratingLocal] = useState(false)
	const { data, status, summarize } = useAISummarize({
		type: "teaser",
		format: "plain-text",
		length: "short",
		outputLanguage: "es",
	})

	const availability = useMemo(() => 
		status === "initializing" || status === "downloading" ? "checking" :
		status === "idle" || status === "success" ? "available" : "unavailable",
		[status]
	)
	
	const isGenerating = isGeneratingLocal || status === "summarizing" || status === "initializing" || status === "downloading"
	const summary = data || ""

	const processError = useCallback(
		async (error: Error | string): Promise<string> => {
			const errorMessage = error instanceof Error ? error.message : error
			
			if (!enabled || availability !== "available") {
				return errorMessage
			}

			const context = "Explicá este error técnico de forma simple y breve para un usuario no técnico. Máximo 2 oraciones. Sin detalles técnicos innecesarios. Directo al punto."
			const textWithContext = `INSTRUCCIÓN: ${context}\n\n${errorMessage}`
			const queryKey = ['ai-summary', errorMessage, context]

			setIsGeneratingLocal(true)

			try {
				const cachedData = queryClient.getQueryData<string>(queryKey)
				if (cachedData) return cachedData

				return queryClient.fetchQuery({
					queryKey,
					queryFn: async () => {
						await summarize(textWithContext, context)
						return new Promise<string>((resolve) => {
							const checkData = () => {
								if (data) resolve(data)
								else setTimeout(checkData, 50)
							}
							checkData()
						})
					},
					staleTime: 5 * 60 * 1000,
					gcTime: 10 * 60 * 1000,
				})
			} catch {
				return errorMessage
			} finally {
				setIsGeneratingLocal(false)
			}
		},
		[enabled, availability, queryClient, summarize, data],
	)

	return {
		processError,
		isProcessing: isGenerating,
		processedError: summary || null,
		isAvailable: availability === "available" && enabled
	}
}
