import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send, Trash2, Loader2, User, Bot, X, Wand2, Terminal, Paperclip, StopCircle } from "lucide-react";
import { useAIPrompt, type AIPromptMessage } from "@galiprandi/react-tools";
import { Streamdown } from "streamdown";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { ActionButton } from "@/components/ui/ActionButton";

interface AIChatModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialFile?: File | null;
}

const AI_PROFILES = [
	{
		id: "general",
		label: "General",
		icon: Sparkles,
		systemPrompt: "Eres un asistente experto en ingeniería de software y DevOps para la plataforma ReleaseHub. Ayudas a los usuarios a entender el estado de sus despliegues, repositorios y recursos de Kubernetes. Sé conciso, profesional y servicial. Responde siempre en español."
	},
	{
		id: "optimizer",
		label: "Optimizar Prompts",
		icon: Wand2,
		systemPrompt: "Eres un experto en ingeniería de prompts. Tu objetivo es ayudar al usuario a perfeccionar sus instrucciones para obtener los mejores resultados de modelos de IA. Analiza, critica y mejora los prompts que te proporcionen, enfocándote en la claridad, el contexto y las restricciones. Responde siempre en español."
	},
	{
		id: "devops",
		label: "Especialista DevOps",
		icon: Terminal,
		systemPrompt: "Eres un especialista senior en DevOps y Site Reliability Engineering (SRE). Tienes conocimientos profundos en Kubernetes, Docker, CI/CD pipelines (especialmente GitHub Actions) y monitoreo. Ayudas a diagnosticar problemas complejos de infraestructura y a optimizar flujos de trabajo de despliegue. Responde siempre en español."
	}
] as const;

export function AIChatModal({ isOpen, onClose, initialFile }: AIChatModalProps) {
	const [input, setInput] = useState("");
	const [activeProfileId, setActiveProfileId] = useState<typeof AI_PROFILES[number]["id"]>("general");
	const [attachedFile, setAttachedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const activeProfile = useMemo(() =>
		AI_PROFILES.find(p => p.id === activeProfileId) || AI_PROFILES[0]
	, [activeProfileId]);

	const [messages, setMessages] = useState<AIPromptMessage[]>([
		{ role: "assistant", content: `¡Hola! Soy tu asistente (${activeProfile.label}). ¿En qué puedo ayudarte hoy?` }
	]);

	// Sync state with props/internal selection during render to avoid cascading renders
	const [prevInitialFile, setPrevInitialFile] = useState<File | null | undefined>(undefined);
	const [prevProfileId, setPrevProfileId] = useState(activeProfileId);

	if (isOpen && initialFile && initialFile !== prevInitialFile) {
		setPrevInitialFile(initialFile);
		setAttachedFile(initialFile);
		if (!initialFile.type.startsWith("image/")) {
			setPreviewUrl(null);
		}
	}

	if (activeProfileId !== prevProfileId) {
		setPrevProfileId(activeProfileId);
		setMessages([
			{ role: "assistant", content: `Cambiado a perfil: **${activeProfile.label}**. ¿En qué puedo ayudarte?` }
		]);
		setAttachedFile(null);
		setPreviewUrl(null);
	}

	// Handle preview URL side effects
	useEffect(() => {
		if (attachedFile?.type.startsWith("image/")) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewUrl(reader.result as string);
			};
			reader.readAsDataURL(attachedFile);
		}
	}, [attachedFile]);

	// Focus input when modal opens or initial file is injected
	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => inputRef.current?.focus(), initialFile ? 200 : 100);
			return () => clearTimeout(timer);
		}
	}, [isOpen, initialFile]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data, status, prompt, reset, error } = useAIPrompt({
		initialPrompts: [
			{ role: "system", content: activeProfile.systemPrompt }
		],
		expectedInputs: [
			{ type: "text" },
			{ type: "image" },
			{ type: "audio" }
		],
		streaming: true,
		warmup: true
	});

	// Handle streaming data updates
	const lastProcessedDataRef = useRef<string | null>(null);

	useEffect(() => {
		if (status === "prompting" || status === "success") {
			if (data && data !== lastProcessedDataRef.current) {
				setMessages(prev => {
					const lastMessage = prev[prev.length - 1];
					if (lastMessage && lastMessage.role === "assistant") {
						const newMessages = [...prev];
						newMessages[newMessages.length - 1] = { ...lastMessage, content: data };
						return newMessages;
					} else {
						return [...prev, { role: "assistant", content: data }];
					}
				});
				lastProcessedDataRef.current = data;
			}
		}

		if (status === "idle" || status === "error") {
			lastProcessedDataRef.current = null;
		}
	}, [data, status]);

	// Auto-scroll to bottom
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, data]);

	const handleSend = async () => {
		if (!input.trim() || status === "prompting") return;

		const content = attachedFile ? [input.trim(), attachedFile] : input.trim();
		const userMessage: AIPromptMessage = { role: "user", content: input.trim() };

		setMessages(prev => [...prev, userMessage]);
		setInput("");

		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setAttachedFile(null);
		setPreviewUrl(null);

		try {
			await prompt([{ role: "user", content }]);
		} catch (err) {
			console.error("AI Prompt Error:", err);
		}
	};

	const handleClearChat = () => {
		reset();
		setMessages([
			{ role: "assistant", content: "Conversación reiniciada. ¿En qué más puedo ayudarte?" }
		]);
		setAttachedFile(null);
		setPreviewUrl(null);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAttachedFile(file);
			if (file.type.startsWith("image/")) {
				const url = URL.createObjectURL(file);
				setPreviewUrl(url);
			} else {
				setPreviewUrl(null);
			}
		}
	};

	const removeFile = () => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setAttachedFile(null);
		setPreviewUrl(null);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<BaseDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			title={
				<div className="flex items-center gap-3">
					<div className="p-1.5 rounded-lg bg-ai/10 ring-1 ring-ai/20">
						<activeProfile.icon className="w-4 h-4 text-ai" />
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-bold tracking-tight">Asistente AI</span>
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
							{activeProfile.label}
						</span>
					</div>
				</div>
			}
			description="Chat con inteligencia artificial para ayudarte con ReleaseHub"
			maxWidth="max-w-3xl"
			className="h-[80vh]"
			headerExtra={
				<div className="flex items-center gap-2 mr-2">
					<div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40">
						{AI_PROFILES.map((profile) => (
							<button
								key={profile.id}
								onClick={() => setActiveProfileId(profile.id)}
								className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
									activeProfileId === profile.id
										? "bg-background text-ai shadow-sm ring-1 ring-border/20"
										: "text-muted-foreground/60 hover:text-foreground"
								}`}
							>
								{profile.label}
							</button>
						))}
					</div>
					<div className="w-px h-4 bg-border/40 mx-1" />
					<ActionButton
						action={{ icon: Trash2, label: "Limpiar", color: "default" }}
						onClick={handleClearChat}
						size="sm"
						className="text-muted-foreground hover:text-destructive transition-colors"
					/>
				</div>
			}
		>
			<div className="flex flex-col h-full overflow-hidden bg-muted/5 rounded-b-lg border-t">
				{/* Chat Messages */}
				<div
					ref={scrollRef}
					className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
				>
					{messages.map((msg, i) => (
						<div
							key={i}
							className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
						>
							<div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
								msg.role === "user"
									? "bg-primary/10 border-primary/20 text-primary"
									: "bg-ai/10 border-ai/20 text-ai"
							}`}>
								{msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
							</div>
							<div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
								msg.role === "user"
									? "bg-primary text-primary-foreground rounded-tr-none"
									: "bg-muted/50 border border-border/40 rounded-tl-none"
							}`}>
								<div className="prose prose-sm dark:prose-invert max-w-none break-words">
									<Streamdown>{typeof msg.content === 'string' ? msg.content : "Contenido no soportado"}</Streamdown>
								</div>
							</div>
						</div>
					))}

					{status === "initializing" && (
						<div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse ml-11">
							<Loader2 className="w-3 h-3 animate-spin" />
							<span>Inicializando modelo de IA local...</span>
						</div>
					)}

					{status === "downloading" && (
						<div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse ml-11">
							<Loader2 className="w-3 h-3 animate-spin" />
							<span>Descargando recursos de IA...</span>
						</div>
					)}

					{error && (
						<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-center gap-2 ml-11">
							<X className="w-3 h-3" />
							<span>Error: {error.message}</span>
						</div>
					)}
				</div>

				{/* Input Area */}
				<div className="p-4 bg-background border-t border-border/40">
					{attachedFile && (
						<div className="mb-3 flex items-center gap-2 p-2 bg-muted/20 border border-border/40 rounded-lg animate-in fade-in slide-in-from-bottom-2">
							{previewUrl ? (
								<img src={previewUrl} alt="Preview" className="w-10 h-10 rounded object-cover border border-border/40" />
							) : (
								<div className="w-10 h-10 rounded bg-muted/40 flex items-center justify-center border border-border/40">
									<Paperclip className="w-4 h-4 text-muted-foreground" />
								</div>
							)}
							<div className="flex-1 min-w-0">
								<p className="text-[10px] font-bold truncate text-foreground/80 uppercase tracking-wider">{attachedFile.name}</p>
								<p className="text-[10px] text-muted-foreground/60">{(attachedFile.size / 1024).toFixed(1)} KB</p>
							</div>
							<button
								onClick={removeFile}
								className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					)}

					<div className="relative flex items-end gap-2 bg-muted/30 border border-border/60 rounded-xl p-2 focus-within:ring-2 focus-within:ring-ai/30 focus-within:border-ai/40 transition-all">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							className="hidden"
							accept="image/*,audio/*"
						/>
						<button
							onClick={() => fileInputRef.current?.click()}
							aria-label="Adjuntar archivo"
							className="p-2 text-muted-foreground/60 hover:text-ai transition-colors"
						>
							<Paperclip className="w-4 h-4" />
						</button>
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Pregunta algo sobre ReleaseHub..."
							className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none py-2 px-1 max-h-32 min-h-[40px] placeholder:text-muted-foreground/60"
							rows={1}
						/>
						{status === "prompting" ? (
							<button
								onClick={() => reset()}
								aria-label="Detener respuesta"
								className="p-2 rounded-lg bg-destructive text-destructive-foreground shadow-md hover:opacity-90 transition-all"
							>
								<StopCircle className="w-4 h-4" />
							</button>
						) : (
							<button
								onClick={handleSend}
								aria-label="Enviar mensaje"
								disabled={!input.trim() || status === "initializing" || status === "downloading"}
								className={`p-2 rounded-lg transition-all ${
									input.trim()
										? "bg-ai text-ai-foreground shadow-md hover:opacity-90"
										: "bg-muted text-muted-foreground cursor-not-allowed"
								}`}
							>
								<Send className="w-4 h-4" />
							</button>
						)}
					</div>
					<p className="mt-2 text-[10px] text-center text-muted-foreground/60">
						La IA puede cometer errores. El procesamiento ocurre localmente en tu navegador.
					</p>
				</div>
			</div>
		</BaseDialog>
	);
}
