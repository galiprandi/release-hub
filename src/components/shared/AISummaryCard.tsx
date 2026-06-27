import { Sparkles, Loader2, ClipboardCopy, Check, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Streamdown } from "streamdown";

interface AISummaryCardProps {
	summary: string | null;
	isGenerating: boolean;
	error: string | null;
	onRegenerate: () => void;
	onCopy: () => void;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	isCopied: boolean;
	variant?: "default" | "compact";
}

export function AISummaryCard({
	summary,
	isGenerating,
	error,
	onRegenerate,
	onCopy,
	isCollapsed,
	onToggleCollapse,
	isCopied,
	variant = "default",
}: AISummaryCardProps) {
	if (!summary) return null;

	const isCompact = variant === "compact";

	return (
		<div className={`mb-4 ${isCompact ? 'p-3' : 'p-4'} bg-ai text-ai-foreground border-ai/20 border rounded-lg shadow-sm sticky top-0 z-10 transition-all`}>
			<div className="flex items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-white/10 ring-1 ring-white/20">
						<Sparkles className="w-4 h-4 text-white" />
					</div>
					<span className={`font-semibold tracking-tight ${isCompact ? 'text-xs' : 'text-sm'}`}>Resumen con IA</span>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onToggleCollapse}
						className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:outline-none"
						title={isCollapsed ? "Expandir" : "Colapsar"}
						aria-label={isCollapsed ? "Expandir resumen" : "Colapsar resumen"}
						aria-expanded={!isCollapsed}
					>
						{isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
					</button>
					<button
						type="button"
						onClick={onRegenerate}
						disabled={isGenerating}
						className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:outline-none"
						title="Regenerar resumen"
						aria-label="Regenerar resumen"
					>
						{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
					</button>
					<button
						type="button"
						onClick={onCopy}
						className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:outline-none"
						title="Copiar resumen"
						aria-label="Copiar resumen"
					>
						{isCopied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
					</button>
				</div>
			</div>
			{!isCollapsed && (
				<>
					<div className={`mt-3 ${isCompact ? 'text-ai-foreground/90 text-xs' : 'text-ai-foreground text-sm leading-relaxed'} prose prose-sm max-w-none prose-invert opacity-95`}>
						<Streamdown>{summary}</Streamdown>
					</div>
					{error && (
						<p className="text-destructive-foreground font-medium text-xs mt-3 bg-destructive/20 p-2 rounded border border-destructive/30">
							{error}
						</p>
					)}
				</>
			)}
		</div>
	);
}
