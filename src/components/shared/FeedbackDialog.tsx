import { useState, useCallback, useMemo } from "react"
import React from "react"
import { MessageSquare, Loader2, CheckCircle2, Send, AlertCircle, Sparkles, Terminal, ChevronRight } from "lucide-react"
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
					className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent hover:border-border rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1"
				>
					<MessageSquare className="w-3.5 h-3.5" />
					Feedback
				</button>
			)}
			<BaseDialog
				open={open}
				onOpenChange={handleOpenChange}
				title={
					<div className="flex items-center gap-2">
						{step === "describe" && <><MessageSquare className="w-4 h-4 text-primary" /> <span>Describí tu feedback</span></>}
						{step === "review" && <><CheckCircle2 className="w-4 h-4 text-primary" /> <span>Revisá tu feedback</span></>}
						{step === "sending" && <><Loader2 className="w-4 h-4 animate-spin text-primary" /> <span>Enviando...</span></>}
						{step === "success" && <><CheckCircle2 className="w-4 h-4 text-success" /> <span>¡Feedback enviado!</span></>}
						{step === "error" && <><AlertCircle className="w-4 h-4 text-destructive" /> <span>Error</span></>}
					</div>
				}
				description="Panel de comunicación directa con el equipo de ingeniería de ReleaseHub."
				maxWidth={dialogWidth}
			>
				{/* Stepper Visual */}
					{step !== "sending" && step !== "success" && step !== "error" && (
						<div className="flex items-center justify-center gap-6 mb-8" role="stepper" aria-label="Progreso del feedback">
							{steps.map((s, idx) => (
								<React.Fragment key={s.id}>
									<div className="flex flex-col items-center gap-2">
										<button
											type="button"
											onClick={() => handleStepClick(s.id)}
											aria-current={s.id === step ? "step" : undefined}
											aria-label={`Paso ${idx + 1}: ${s.label}${isCompleted(s.id) ? " - Completado" : s.id === step ? " - Actual" : ""}`}
											aria-disabled={idx > currentStepIndex}
											className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
												isCompleted(s.id) 
												? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
													: s.id === step 
													? "bg-primary text-primary-foreground shadow-sm cursor-pointer"
													: "bg-muted/30 text-muted-foreground/40 border border-border cursor-default"
											} focus:outline-none focus:ring-2 focus:ring-primary/30`}
										>
											{isCompleted(s.id) ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
										</button>
										<span className={`text-xs font-medium uppercase tracking-widest ${
											s.id === step ? "text-foreground" : "text-muted-foreground/40"
										}`} aria-hidden="true">
											{s.label}
										</span>
									</div>
									{idx < steps.length - 1 && (
										<div className={`w-12 h-px ${
															isCompleted(s.id) ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-border/20"
														}`} aria-hidden="true" />
									)}
								</React.Fragment>
							))}
						</div>
					)}

					{/* Step 1: Describe */}
					{step === "describe" && (
						<div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide">
							<div className="space-y-4">
								<div className="space-y-2">
									<label htmlFor="feedback-description" className="text-xs font-medium text-muted-foreground/60 ml-1">
										Descripción Técnica
									</label>
									<textarea
										id="feedback-description"
										autoFocus
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Explica en detalle tu idea, problema o sugerencia. El sistema utilizará IA para normalizar el reporte..."
										rows={8}
										className="w-full px-4 py-3 text-xs bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all duration-200 leading-relaxed font-mono placeholder:text-muted-foreground/40"
									/>
								</div>

								{aiError && (
									<div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
										<AlertCircle className="w-4 h-4 text-destructive" />
										<p className="text-xs font-medium text-destructive">{aiError.message}</p>
									</div>
								)}
								{error && (
									<div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
										<AlertCircle className="w-4 h-4 text-destructive" />
										<p className="text-xs font-medium text-destructive">{error}</p>
									</div>
								)}
							</div>

							<div className="mt-8 pt-4 border-t border-border flex justify-end flex-shrink-0">
								<button
									onClick={handleNext}
									disabled={isGenerating || isEnhancing || !description.trim()}
									className="px-6 py-2.5 text-xs font-medium uppercase tracking-widest bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
								>
									{(isGenerating || isEnhancing) ? (
										<>
											<Loader2 className="w-3.5 h-3.5 animate-spin" />
											<span>{getStatusMessage}</span>
										</>
									) : (
										<>
											<span>Siguiente</span>
											<ChevronRight className="w-3.5 h-3.5" />
										</>
									)}
								</button>
							</div>
						</div>
					)}

					{/* Step: Review */}
					{step === "review" && (
						<div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide">
							<div className="space-y-6">
								<div className="space-y-2">
									<label htmlFor="feedback-title" className="text-xs font-medium text-muted-foreground/60 ml-1">
										Título Sugerido por IA
									</label>
									<input
										id="feedback-title"
										type="text"
										value={aiTitle}
										onChange={(e) => setAiTitle(e.target.value)}
										className="w-full px-4 py-3 text-xs bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-bold uppercase tracking-tight"
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="feedback-body" className="text-xs font-medium text-muted-foreground/60 ml-1">
										Propuesta Estructurada
									</label>
									<textarea
										id="feedback-body"
										value={aiBody}
										onChange={(e) => setAiBody(e.target.value)}
										rows={8}
										className="w-full px-4 py-3 text-xs bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all duration-200 leading-relaxed"
									/>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md">
										#feedback
									</span>
									<span className="text-xs font-medium bg-muted text-muted-foreground/60 border border-border px-2.5 py-1 rounded-md">
										#ai-generated
									</span>
								</div>
							</div>

							<div className="mt-8 pt-4 border-t border-border flex justify-between items-center flex-shrink-0">
								<button
									onClick={() => setStep("describe")}
									className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
								>
									Volver a editar
								</button>
								<button
									onClick={handleSend}
									disabled={!aiTitle.trim() || !aiBody.trim()}
									className="px-6 py-2.5 text-xs font-medium uppercase tracking-widest bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
								>
									<Send className="w-3.5 h-3.5" />
									Enviar Feedback
								</button>
							</div>
						</div>
					)}

					{/* Step: Sending */}
					{step === "sending" && (
						<div className="flex flex-col items-center justify-center flex-1 py-12 text-center space-y-6">
							<div className="relative">
								<div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
								<Loader2 className="w-16 h-16 animate-spin text-primary relative z-10" />
							</div>
							<div className="space-y-2">
								<p className="text-xs font-medium text-foreground">Sincronizando con GitHub</p>
								<p className="text-xs font-medium text-muted-foreground/40">
									Creando registro técnico en <span className="text-foreground/60">galiprandi/release-hub</span>
								</p>
							</div>
						</div>
					)}

					{/* Step: Success */}
					{step === "success" && (
						<div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-6">
							<div className="w-16 h-16 rounded-full bg-success/20 border border-success/20 flex items-center justify-center shadow-[0_0_20px_rgba(var(--success),0.1)]">
								<CheckCircle2 className="w-8 h-8 text-success" />
							</div>
							<div className="space-y-4">
								<div className="space-y-1">
									<p className="text-xs font-medium text-success">¡Feedback Enviado!</p>
									<p className="text-xs font-medium text-muted-foreground/60">
										Tu propuesta ya es un issue oficial
									</p>
								</div>
								{issueUrl && (
									<a
										href={issueUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-primary hover:bg-muted/30 transition-all"
									>
										<span>Ver en GitHub</span>
										<Terminal className="w-3.5 h-3.5" />
									</a>
								)}
							</div>
							<button
								type="button"
								onClick={() => handleOpenChange(false)}
								className="w-full mt-4 px-4 py-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
							>
								Finalizar
							</button>
						</div>
					)}

					{/* Step: Error */}
					{step === "error" && (
						<div className="flex flex-col items-center justify-center flex-1 py-4 text-center space-y-6">
							<div className="w-full space-y-4">
								{isProcessingError ? (
									<div className="flex flex-col items-center gap-6 py-8">
										<div className="relative">
											<div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
											<Loader2 className="w-16 h-16 animate-spin text-primary relative z-10" />
										</div>
										<div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground/40">
											<Sparkles className="w-4 h-4" />
											<span>Análisis IA en curso</span>
										</div>
									</div>
								) : (
									<div className="space-y-4">
										<div className="w-16 h-16 rounded-full bg-destructive/20 border border-destructive/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(var(--destructive),0.1)]">
											<AlertCircle className="w-8 h-8 text-destructive" />
										</div>
										<div className="flex items-center justify-center gap-2">
											<button
												onClick={() => setShowOriginalError(!showOriginalError)}
												className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 border ${
													showOriginalError 
														? 'bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
														: 'bg-muted/30 text-muted-foreground/60 border-border'
												}`}
											>
												{showOriginalError ? (
													<>
														<Terminal className="w-3.5 h-3.5" />
														Error Original
													</>
												) : (
													<>
														<Sparkles className="w-3.5 h-3.5" />
														Análisis IA
													</>
												)}
											</button>
										</div>
										<div className="bg-muted/30 border border-border rounded-md p-4 text-xs font-medium leading-relaxed text-left">
											<div className={showOriginalError ? "text-destructive font-mono" : "text-foreground/90"}>
												{showOriginalError ? originalError : error}
											</div>
										</div>
									</div>
								)}
							</div>
							<div className="flex gap-3 w-full">
								<button
									type="button"
									onClick={() => handleOpenChange(false)}
									className="flex-1 px-4 py-2.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
								>
									Cerrar
								</button>
								<button
									type="button"
									onClick={() => setStep("review")}
									className="flex-1 px-4 py-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
