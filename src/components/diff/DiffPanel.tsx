import React from 'react';
import { Copy, Check } from 'lucide-react';

interface DiffPanelProps {
	title: string;
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
	scrollRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function DiffPanel({
	title,
	value,
	onChange,
	placeholder,
	onScroll,
	scrollRef
}: DiffPanelProps) {
	const [copied, setCopied] = React.useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	return (
		<div className="flex flex-col h-full border rounded-xl bg-muted/10 shadow-sm overflow-hidden border-border/60">
			<div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 border-border/60">
				<h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
					{title}
				</h3>
				<button
					onClick={handleCopy}
					className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-md transition-all"
					title="Copiar contenido"
				>
					{copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
				</button>
			</div>
			<div className="relative flex-1">
				<textarea
					ref={scrollRef}
					onScroll={onScroll}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="absolute inset-0 w-full h-full p-4 text-xs font-mono bg-transparent border-none focus:ring-2 focus:ring-primary/20 resize-none z-10 overflow-auto scrollbar-hide"
					spellCheck={false}
				/>
			</div>
		</div>
	);
}
