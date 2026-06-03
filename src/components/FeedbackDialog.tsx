import { useState, useCallback, useMemo } from "react"
import React from "react"
import { MessageSquare, Loader2, CheckCircle2, Send, AlertCircle, Sparkles, Terminal } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useAISummarize } from "@galiprandi/react-tools"
import { useAIErrorProcessor } from "@/hooks/useAIErrorProcessor"
import { runCommand } from "@/api/exec"
import { BaseDialog } from "@/components/ui/BaseDialog"

type Step = "describe" | "review" | "sending" | "success" | "error"

const MAX_TITLE_LENGTH = 60
const MAX_TITLE_WORDS = 8
const REPO = "galiprandi/release-hub"

// Helper: generate fallback title from description
const generateFallbackTitle = (description: string): string => {
	const words = description.split(' ')
	let title = words.slice(0, MAX_TITLE_WORDS).join(' ')
	if (title.length > MAX_TITLE_LENGTH) {
		title = title.slice(0, MAX_TITLE_LENGTH - 3) + '...'
	}
	return title
}

export function FeedbackDialog({ showTrigger = true, open: controlledOpen, onOpenChange }: { showTrigger?: boolean, open?: boolean, onOpenChange?: (open: boolean) => void }) {
	const [internalOpen, setInternalOpen] = useState(false)
	const open = controlledOpen !== undefined ? controlledOpen : internalOpen
	const setOpen = onOpenChange || setInternalOpen
	const [step, setStep] = useState<Step>("describe")
	const [description, setDescription] = useState("")
	const [aiTitle, setAiTitle] = useState("")
	const [aiBody, setAiBody] = useState("")
	const [issueUrl, setIssueUrl] = useState("")
	const [error, setError] = useState("")
	const [originalError, setOriginalError] = useState("")
	const [showOriginalError, setShowOriginalError] = useState(false)
	const [isGeneratingLocal, setIsGeneratingLocal] = useState(false)
	const queryClient = useQueryClient()
	
	const { data, status, error: aiError, summarize, reset: resetAI } = useAISummarize({
		type: "headline",
		format: "plain-text",
		length: "short",
		outputLanguage: "es",
		streaming: true,
		warmup: false,
	})

	const availability = useMemo(() => 
		status === "initializing" || status === "downloading" ? "checking" :
		status === "idle" || status === "success" ? "available" : "unavailable",
		[status]
	)
	
	const isGenerating = isGeneratingLocal || status === "summarizing" || status === "initializing" || status === "downloading"

	const getStatusMessage = useMemo(() => {
		if (status === "initializing") return "Inicializando..."
		if (status === "downloading") return "Descargando..."
		if (status === "summarizing") return "Generando..."
		return "Generando..."
	}, [status])

	const { processError, isProcessing: isProcessingError } = useAIErrorProcessor()

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (newOpen) {
			setStep("describe")
			setDescription("")
			setAiTitle("")
			setAiBody("")
			setIssueUrl("")
			setError("")
			setOriginalError("")
			setShowOriginalError(false)
			queryClient.removeQueries({ queryKey: ['ai-summary'] })
			resetAI()
		}
	}

	const [isEnhancing, setIsEnhancing] = useState(false)

	const generateWithCache = useCallback(async (text: string, options: { context: string }): Promise<string> => {
		const { context } = options
		const textWithContext = `INSTRUCCIÓN: ${context}\n\n${text}`
		const queryKey = ['ai-summary', text, context]

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
		} catch (err) {
			console.error('[FeedbackDialog] Error generating:', err)
			return ""
		} finally {
			setIsGeneratingLocal(false)
		}
	}, [queryClient, summarize, data])
	
	const handleNext = async () => {
		if (step !== "describe") return

		// Si AI no está disponible, ir directo a review con fallback
		if (availability !== "available") {
			setAiTitle(generateFallbackTitle(description))
			setAiBody(description)
			setStep("review")
			return
		}

		setIsEnhancing(true)
		try {
			// Hacer 3 llamadas paralelas a AI
			const [titleResult, , descriptionResult] = await Promise.all([
				generateWithCache(description, {
					context: `Generá un título conciso (máximo ${MAX_TITLE_LENGTH} caracteres) para un issue de GitHub basado en la siguiente descripción de feedback.`
				}),
				generateWithCache(description, {
					context: "Evalúa si la siguiente descripción de feedback es lo suficientemente clara y detallada para crear un issue de GitHub útil. Si es vaga o ambigua, genera 2-3 preguntas específicas y directas (cada una terminando con signo de interrogación, una por línea) para obtener más detalles. Si es clara y detallada, responde únicamente 'CLARA'."
				}),
				generateWithCache(description, {
					context: "Reescribí la siguiente descripción de feedback para un issue de GitHub como una solicitud de feature o mejora. El tono debe ser sugerente y propositivo, no descriptivo de algo ya implementado. Debe incluir: el problema o necesidad, la propuesta de solución, y el valor esperado. Sin bullet points, en formato de párrafo natural."
				})
			])

			// Procesar título con fallback
			let processedTitle = titleResult.trim().slice(0, MAX_TITLE_LENGTH)
			if (!processedTitle || processedTitle === "CLARA") {
				processedTitle = generateFallbackTitle(description)
			}

			// Procesar descripción con fallback
			let processedDescription = descriptionResult.trim()
			if (!processedDescription || processedDescription === "CLARA" || processedDescription.includes("CLARA")) {
				processedDescription = description
			}

			setAiTitle(processedTitle)
			setAiBody(processedDescription)
			setStep("review")
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al evaluar la descripción")
			// Fallback: ir a review con texto simple
			setAiTitle(generateFallbackTitle(description))
			setAiBody(description)
			setStep("review")
		} finally {
			setIsEnhancing(false)
		}
	}


	const handleSend = async () => {
		setStep("sending")
		setError("")
		
		try {
			const result = await runCommand([
				'gh',
				'issue',
				'create',
				'--repo',
				REPO,
				'--title',
				aiTitle,
				'--body',
				aiBody,
			])
			
			const url = result.stdout.trim()
			setIssueUrl(url)
			setStep("success")
		} catch (err) {
			
			// Procesar error con AI y mostrar el resultado
			const errorObj = err instanceof Error ? err : new Error(String(err))
			
			setError("Procesando error...")
			setOriginalError(errorObj.message)
			setShowOriginalError(true) // Mostrar original mientras AI analiza
			setStep("error")
			
			processError(errorObj).then(aiMessage => {
				setError(aiMessage)
				setShowOriginalError(false) // Cambiar a versión AI cuando responde
			}).catch(() => {
				// Fallback: mostrar mensaje genérico si falla AI
				const errorMessage = errorObj.message
				if (errorMessage.includes("Unauthorized")) {
					setError("No tenés permisos para crear issues en este repositorio. Contactá al administrador del repositorio.")
				} else if (errorMessage.includes("GraphQL")) {
					setError("Error de autenticación con GitHub. Verificá tu sesión y permisos.")
				} else {
					setError("No se pudo crear el issue en GitHub. Verificá que tengas los permisos necesarios o intentá nuevamente.")
				}
			})
		}
	}

	const getSteps = () => {
		return [
			{ id: "describe", label: "Describir" },
			{ id: "review", label: "Revisar" },
		]
	}

	const handleStepClick = (stepId: string) => {
		// Solo permitir navegar a pasos anteriores o al paso actual
		const clickedIndex = steps.findIndex(s => s.id === stepId)
		if (clickedIndex <= currentStepIndex) {
			setStep(stepId as Step)
		}
	}

	const steps = getSteps()
	const currentStepIndex = steps.findIndex(s => s.id === step)
	const isCompleted = (stepId: string) => {
		const idx = steps.findIndex(s => s.id === stepId)
		return idx < currentStepIndex
	}

	const dialogWidth = step === "success" ? "max-w-sm" : step === "error" ? "max-w-md" : "max-w-lg"

	return (
		<>
			{showTrigger && (
				<button
					type="button"
					onClick={() => handleOpenChange(true)}
					aria-haspopup="dialog"
					className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
				>
					<MessageSquare className="w-4 h-4" />
					Feedback
				</button>
			)}
			<BaseDialog
				open={open}
				onOpenChange={handleOpenChange}
				title={
					<>
						{step === "describe" && <><MessageSquare className="w-4 h-4" /> Describí tu feedback</>}
						{step === "review" && <><CheckCircle2 className="w-4 h-4" /> Revisá tu feedback</>}
						{step === "sending" && <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>}
						{step === "success" && <><CheckCircle2 className="w-4 h-4 text-success" /> ¡Feedback enviado!</>}
						{step === "error" && <><AlertCircle className="w-4 h-4 text-destructive" /> Error</>}
					</>
				}
				description="Enviar feedback sobre ReleaseHub"
				maxWidth={dialogWidth}
			>
				{/* Stepper Visual */}
					{step !== "sending" && step !== "success" && step !== "error" && (
						<div className="flex items-center justify-center gap-4 mb-6" role="stepper" aria-label="Progreso del feedback">
							{steps.map((s, idx) => (
								<React.Fragment key={s.id}>
									<div className="flex flex-col items-center gap-1">
										<button
											type="button"
											onClick={() => handleStepClick(s.id)}
											aria-current={s.id === step ? "step" : undefined}
											aria-label={`Paso ${idx + 1}: ${s.label}${isCompleted(s.id) ? " - Completado" : s.id === step ? " - Actual" : ""}`}
											aria-disabled={idx > currentStepIndex}
											className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
												isCompleted(s.id) 
													? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 cursor-pointer shadow-sm active:scale-95"
													: s.id === step 
														? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 cursor-pointer shadow-sm active:scale-95"
														: "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105 cursor-pointer active:scale-95"
											} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
										>
											{isCompleted(s.id) ? <CheckCircle2 className="w-4 h-4 text-primary-foreground" /> : idx + 1}
										</button>
										<span className={`text-xs font-medium ${
											s.id === step ? "text-foreground" : "text-muted-foreground"
										}`} aria-hidden="true">
											{s.label}
										</span>
									</div>
									{idx < steps.length - 1 && (
										<div className={`w-12 h-0.5 ${
															isCompleted(s.id) ? "bg-primary" : "bg-muted"
														}`} aria-hidden="true" />
									)}
								</React.Fragment>
							))}
						</div>
					)}

					{/* Step 1: Describe */}
					{step === "describe" && (
						<div className="flex flex-col flex-1 overflow-y-auto">
							<div className="space-y-4">
								<div>
									<label htmlFor="feedback-description" className="block text-sm font-medium mb-2">
										Descripción
									</label>
									<textarea
										id="feedback-description"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Explicá en detalle tu idea, problema o sugerencia. Cuanto más contexto des, mejor será el resultado..."
										rows={8}
										className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all duration-200"
									/>
								</div>

								{aiError && <p className="text-sm text-destructive">{aiError.message}</p>}
								{error && <p className="text-sm text-destructive">{error}</p>}
							</div>

							<div className="mt-4 pt-4 border-t flex justify-end flex-shrink-0">
								<button
									onClick={handleNext}
									disabled={isGenerating || isEnhancing}
									className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
								>
									{(isGenerating || isEnhancing) ? <><Loader2 className="w-4 h-4 animate-spin" /> {getStatusMessage}</> : "Siguiente"}
								</button>
							</div>
						</div>
					)}

					{/* Step: Review */}
					{step === "review" && (
						<div className="flex flex-col flex-1 overflow-y-auto">
							<div className="space-y-4">
								<div>
									<label htmlFor="feedback-title" className="block text-sm font-medium mb-2">
										Título
									</label>
									<input
										id="feedback-title"
										type="text"
										value={aiTitle}
										onChange={(e) => setAiTitle(e.target.value)}
										className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
									/>
								</div>

								<div>
									<label htmlFor="feedback-body" className="block text-sm font-medium mb-2">
										Descripción
									</label>
									<textarea
										id="feedback-body"
										value={aiBody}
										onChange={(e) => setAiBody(e.target.value)}
										rows={8}
										className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all duration-200"
									/>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-xs bg-muted px-2 py-1 rounded-full">feedback</span>
								</div>
							</div>

							<div className="mt-4 pt-4 border-t flex justify-end flex-shrink-0">
								<button
									onClick={handleSend}
									disabled={!aiTitle.trim() || !aiBody.trim()}
									className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
								>
									<Send className="w-4 h-4" />
									Enviar Feedback
								</button>
							</div>
						</div>
					)}

					{/* Step: Sending */}
					{step === "sending" && (
						<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
							<Loader2 className="w-12 h-12 animate-spin text-primary" />
							<div>
								<p className="text-lg font-semibold">Creando issue en GitHub...</p>
								<p className="text-sm text-muted-foreground mt-1">
									Esto puede demorar unos segundos
								</p>
							</div>
						</div>
					)}

					{/* Step: Success */}
					{step === "success" && (
						<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
							<CheckCircle2 className="w-12 h-12 text-success" />
							<div>
								<p className="text-lg font-semibold">¡Feedback enviado!</p>
								<p className="text-sm text-muted-foreground mt-1">
									Tu feedback ha sido enviado como issue en GitHub
								</p>
								{issueUrl && (
									<a
										href={issueUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
									>
										Ver issue en GitHub
										<Send className="w-3 h-3" />
									</a>
								)}
							</div>
							<button
								type="button"
								onClick={() => handleOpenChange(false)}
								className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								Cerrar
							</button>
						</div>
					)}

					{/* Step: Error */}
					{step === "error" && (
						<div className="flex flex-col items-center justify-center flex-1 py-4 text-center space-y-4">
							<div className="space-y-2">
								{isProcessingError ? (
									<div className="flex flex-col items-center gap-4">
										<Loader2 className="w-12 h-12 animate-spin text-primary" />
										<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
											<Sparkles className="w-4 h-4" />
											<span>Analizando error con IA...</span>
										</div>
									</div>
								) : (
									<div className="space-y-3">
										<AlertCircle className="w-12 h-12 text-destructive mx-auto" />
										<div className="flex items-center justify-end gap-2">
											<button
												onClick={() => setShowOriginalError(!showOriginalError)}
												className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
													showOriginalError 
														? 'bg-destructive/10 text-destructive' 
														: 'bg-purple-500/10 text-purple-500'
												}`}
											>
												{showOriginalError ? (
													<>
														<Terminal className="w-3 h-3" />
														Error original
													</>
												) : (
													<>
														<Sparkles className="w-3 h-3" />
														Análisis IA
													</>
												)}
											</button>
										</div>
										<div className="text-sm text-destructive prose prose-sm max-w-none">
											{showOriginalError ? originalError : error}
										</div>
									</div>
								)}
							</div>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => handleOpenChange(false)}
									className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									Cerrar
								</button>
								<button
									type="button"
									onClick={() => setStep("review")}
									className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									Reintentar
								</button>
							</div>
						</div>
					)}
			</BaseDialog>
		</>
	)
}
