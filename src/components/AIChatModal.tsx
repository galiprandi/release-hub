import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Trash2, Loader2, User, Bot, X } from "lucide-react";
import { useAIPrompt, type AIPromptMessage } from "@galiprandi/react-tools";
import { Streamdown } from "streamdown";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { ActionButton } from "@/components/ui/ActionButton";

interface AIChatModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AIChatModal({ isOpen, onClose }: AIChatModalProps) {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<AIPromptMessage[]>([
		{ role: "assistant", content: "¡Hola! Soy tu asistente de ReleaseHub. ¿En qué puedo ayudarte hoy?" }
	]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const { data, status, prompt, reset, error } = useAIPrompt({
		initialPrompts: [
			{ role: "system", content: "Eres un asistente experto en ingeniería de software y DevOps para la plataforma ReleaseHub. Ayudas a los usuarios a entender el estado de sus despliegues, repositorios y recursos de Kubernetes. Sé conciso, profesional y servicial. Responde siempre en español." }
		],
		streaming: true,
		warmup: true
	});

	// Handle streaming data updates
	useEffect(() => {
		if (data && status === "prompting") {
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
		} else if (status === "success" && data) {
            // Ensure the final message is updated when streaming finishes
            setMessages(prev => {
				const lastMessage = prev[prev.length - 1];
				if (lastMessage && lastMessage.role === "assistant") {
					const newMessages = [...prev];
					newMessages[newMessages.length - 1] = { ...lastMessage, content: data };
					return newMessages;
				}
                return prev;
			});
        }
	}, [data, status]);

	// Auto-scroll to bottom
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, data]);

	// Focus input on open
	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [isOpen]);

	const handleSend = async () => {
		if (!input.trim() || status === "prompting") return;

		const userMessage: AIPromptMessage = { role: "user", content: input.trim() };
		setMessages(prev => [...prev, userMessage]);
		setInput("");

		try {
			// We send the current message. The hook handles the session context.
			await prompt(input.trim());
		} catch (err) {
			console.error("AI Prompt Error:", err);
		}
	};

	const handleClearChat = () => {
		reset();
		setMessages([
			{ role: "assistant", content: "Conversación reiniciada. ¿En qué más puedo ayudarte?" }
		]);
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
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-ai/10 ring-1 ring-ai/20">
						<Sparkles className="w-4 h-4 text-ai" />
					</div>
					<span>Asistente AI</span>
				</div>
			}
			description="Chat con inteligencia artificial para ayudarte con ReleaseHub"
			maxWidth="max-w-3xl"
			className="h-[80vh]"
			headerExtra={
				<ActionButton
					action={{ icon: Trash2, label: "Limpiar", color: "default" }}
					onClick={handleClearChat}
					size="sm"
					className="text-muted-foreground hover:text-destructive transition-colors"
				/>
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
					<div className="relative flex items-end gap-2 bg-muted/30 border border-border/60 rounded-xl p-2 focus-within:ring-2 focus-within:ring-ai/30 focus-within:border-ai/40 transition-all">
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Pregunta algo sobre ReleaseHub..."
							className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none py-2 px-1 max-h-32 min-h-[40px] placeholder:text-muted-foreground/60"
							rows={1}
						/>
						<button
							onClick={handleSend}
							disabled={!input.trim() || status === "prompting" || status === "initializing" || status === "downloading"}
							className={`p-2 rounded-lg transition-all ${
								input.trim() && status !== "prompting"
									? "bg-ai text-ai-foreground shadow-md hover:opacity-90"
									: "bg-muted text-muted-foreground cursor-not-allowed"
							}`}
						>
							{status === "prompting" ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Send className="w-4 h-4" />
							)}
						</button>
					</div>
					<p className="mt-2 text-[10px] text-center text-muted-foreground/60">
						La IA puede cometer errores. El procesamiento ocurre localmente en tu navegador.
					</p>
				</div>
			</div>
		</BaseDialog>
	);
}
